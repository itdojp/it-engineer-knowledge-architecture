#!/usr/bin/env python3

import argparse
import json
import os
import re
from pathlib import Path


SCOPES = ['https://www.googleapis.com/auth/youtube.force-ssl']
YOUTUBE_DATA = Path('docs/_data/youtube.json')
CATALOG_DATA = Path('docs/_data/catalog.json')
DESCRIPTION_DIR = Path('output/youtube_descriptions')
MAX_VIDEO_TITLE_LENGTH = 100
TITLE_SUFFIX_JA = '」紹介動画 【ITエンジニア知識アーキテクチャ】'
TITLE_SUFFIX_EN = "' Overview [IT Engineer Knowledge Architecture]"
VIDEO_LOOKUP_BATCH_SIZE = 50


def load_video_inventory(path=YOUTUBE_DATA, catalog_path=CATALOG_DATA):
    data = json.loads(Path(path).read_text(encoding='utf-8'))
    books = data.get('books')
    if not isinstance(books, list):
        raise ValueError('docs/_data/youtube.json books must be an array')

    seen_books = set()
    seen_videos = set()
    for index, book in enumerate(books):
        book_id = book.get('book_id')
        if not book_id:
            raise ValueError(f'books[{index}] is missing book_id')
        if book_id in seen_books:
            raise ValueError(f'duplicate book_id: {book_id}')
        seen_books.add(book_id)
        for language in ('ja', 'en'):
            video_id = book.get(f'video_{language}_id')
            video_url = book.get(f'video_{language}_url')
            if not isinstance(video_id, str) or not re.fullmatch(r'[A-Za-z0-9_-]{11}', video_id):
                raise ValueError(f'{book_id}: video_{language}_id must be a valid 11-character YouTube video ID')
            if video_url != f'https://youtu.be/{video_id}':
                raise ValueError(f'{book_id}: video_{language}_url does not match video id')
            if video_id in seen_videos:
                raise ValueError(f'duplicate YouTube video id: {video_id}')
            seen_videos.add(video_id)

    catalog = json.loads(Path(catalog_path).read_text(encoding='utf-8'))
    published = sorted(
        (book for book in catalog.get('books', []) if book.get('status') == 'published'),
        key=lambda book: book['displayOrder'],
    )
    if [book['book_id'] for book in books] != [book['id'] for book in published]:
        raise ValueError('YouTube inventory must match published catalog books in displayOrder')

    inventory = []
    for video_book, catalog_book in zip(books, published):
        inventory.append({
            **video_book,
            'title_ja': catalog_book['title']['ja'],
            'title_en': catalog_book['title']['en'],
        })
    return inventory


def validate_descriptions(books, description_dir=DESCRIPTION_DIR):
    missing = []
    for book in books:
        for language in ('ja', 'en'):
            path = Path(description_dir) / f"{book['book_id']}_{language}.txt"
            if not path.is_file() or path.stat().st_size == 0:
                missing.append(str(path))
    if missing:
        raise ValueError(f'missing generated descriptions: {missing}')


def load_expected_channel_id(path=YOUTUBE_DATA):
    data = json.loads(Path(path).read_text(encoding='utf-8'))
    channel_id = data.get('meta', {}).get('channel', {}).get('id')
    if not isinstance(channel_id, str) or not re.fullmatch(r'UC[A-Za-z0-9_-]{22}', channel_id):
        raise ValueError('docs/_data/youtube.json must define a valid canonical channel ID')
    return channel_id


def preflight_video_updates(youtube, books, expected_channel_id):
    owned_channels = youtube.channels().list(part='id', mine=True).execute().get('items', [])
    owned_channel_ids = {channel.get('id') for channel in owned_channels}
    if expected_channel_id not in owned_channel_ids:
        raise RuntimeError('authenticated account does not own the canonical YouTube channel')

    video_ids = [
        book[f'video_{language}_id']
        for book in books
        for language in ('ja', 'en')
    ]
    found = {}
    for offset in range(0, len(video_ids), VIDEO_LOOKUP_BATCH_SIZE):
        batch = video_ids[offset:offset + VIDEO_LOOKUP_BATCH_SIZE]
        response = youtube.videos().list(part='snippet', id=','.join(batch)).execute()
        for item in response.get('items', []):
            found[item.get('id')] = item.get('snippet', {}).get('channelId')

    missing = [video_id for video_id in video_ids if video_id not in found]
    wrong_channel = [
        video_id for video_id in video_ids
        if video_id in found and found[video_id] != expected_channel_id
    ]
    if missing or wrong_channel:
        raise RuntimeError(
            f'YouTube preflight failed; missing videos={missing}, wrong-channel videos={wrong_channel}'
        )
    print(f'✅ YouTube API preflight passed ({len(video_ids)} videos owned by {expected_channel_id})')


def compose_video_title(book, language):
    if language == 'ja':
        prefix = '「'
        suffix = TITLE_SUFFIX_JA
        raw_title = book['title_ja']
    elif language == 'en':
        prefix = "'"
        suffix = TITLE_SUFFIX_EN
        raw_title = book['title_en'] or book['book_id']
    else:
        raise ValueError(f'unsupported language: {language}')

    available = MAX_VIDEO_TITLE_LENGTH - len(prefix) - len(suffix)
    if available < 1:
        raise ValueError('fixed YouTube title text exceeds the title length limit')
    if len(raw_title) > available:
        raw_title = f'{raw_title[:available - 1].rstrip()}…'
    return f'{prefix}{raw_title}{suffix}'


def get_authenticated_service():
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build

    creds = None
    if 'YOUTUBE_TOKEN_JSON' in os.environ:
        token_info = json.loads(os.environ['YOUTUBE_TOKEN_JSON'])
        creds = Credentials.from_authorized_user_info(token_info, SCOPES)
    elif os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if os.environ.get('GITHUB_ACTIONS') == 'true':
                raise RuntimeError('YOUTUBE_TOKEN_JSON is not configured correctly for GitHub Actions')
            flow = InstalledAppFlow.from_client_secrets_file('client_secrets.json', SCOPES)
            creds = flow.run_local_server(port=0)
        Path('token.json').write_text(creds.to_json(), encoding='utf-8')

    return build('youtube', 'v3', credentials=creds)


def update_video(youtube, video_id, title, description, category_id=None):
    from googleapiclient.errors import HttpError

    try:
        response = youtube.videos().list(part='snippet,status', id=video_id).execute()
        if not response.get('items'):
            print(f'❌ Video not found: {video_id}')
            return False

        video = response['items'][0]
        snippet = video['snippet']
        snippet['title'] = title
        snippet['description'] = description
        if category_id:
            snippet['categoryId'] = category_id

        youtube.videos().update(
            part='snippet,status',
            body={
                'snippet': snippet,
                'status': video['status'],
                'id': video_id,
            },
        ).execute()
        print(f'✅ Updated video: {title} (ID: {video_id})')
        return True
    except HttpError as error:
        print(f'❌ YouTube API error (ID: {video_id}): {error}')
        return False


def update_all(youtube, books, description_dir=DESCRIPTION_DIR):
    failures = []
    for book in books:
        book_id = book['book_id']
        titles = {
            'ja': compose_video_title(book, 'ja'),
            'en': compose_video_title(book, 'en'),
        }
        for language in ('ja', 'en'):
            description_path = Path(description_dir) / f'{book_id}_{language}.txt'
            description = description_path.read_text(encoding='utf-8')
            video_id = book[f'video_{language}_id']
            print(f'Updating [{language.upper()}]: {titles[language]}')
            if not update_video(youtube, video_id, titles[language], description):
                failures.append(f'{book_id}:{language}')
    return failures


def parse_args():
    parser = argparse.ArgumentParser(description='Validate or update the canonical YouTube video inventory.')
    parser.add_argument('--validate-only', action='store_true', help='Validate inventory and generated descriptions without API access.')
    return parser.parse_args()


def main():
    args = parse_args()
    books = load_video_inventory()
    validate_descriptions(books)
    print(f'✅ YouTube inventory and descriptions are aligned ({len(books)} books, {len(books) * 2} videos)')
    if args.validate_only:
        return

    print('Authenticating with the YouTube Data API...')
    youtube = get_authenticated_service()
    preflight_video_updates(youtube, books, load_expected_channel_id())
    failures = update_all(youtube, books)
    if failures:
        raise RuntimeError(f'YouTube updates failed: {failures}')


if __name__ == '__main__':
    main()
