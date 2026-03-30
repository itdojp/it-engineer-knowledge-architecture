import os
import yaml
import json
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
import googleapiclient.errors

# YouTube Data APIを利用するためのスコープ
SCOPES = ['https://www.googleapis.com/auth/youtube.force-ssl']

def get_authenticated_service():
    creds = None
    # GitHub Actions の Secrets からトークンを環境変数として読み込む
    if 'YOUTUBE_TOKEN_JSON' in os.environ:
        token_info = json.loads(os.environ['YOUTUBE_TOKEN_JSON'])
        creds = Credentials.from_authorized_user_info(token_info, SCOPES)
    # ローカル実行時のトークンファイル
    elif os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
        
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if os.environ.get('GITHUB_ACTIONS') == 'true':
                print("❌ YOUTUBE_TOKEN_JSONが正しく設定されていないため、GitHub Actionsでは認証を完了できません。")
                exit(1)
            # client_secrets.json を使ってブラウザで初回認証を行う
            flow = InstalledAppFlow.from_client_secrets_file('client_secrets.json', SCOPES)
            creds = flow.run_local_server(port=0)
        # 次回のためにトークンを保存
        with open('token.json', 'w') as token:
            token.write(creds.to_json())

    return build('youtube', 'v3', credentials=creds)

def update_video(youtube, video_id, title, description, category_id=None): 
    # category_id = None: 既存のカテゴリを維持する
    try:
        # まず現在の動画情報を取得する
        request = youtube.videos().list(
            part="snippet,status",
            id=video_id
        )
        response = request.execute()

        if not response.get('items'):
            print(f"⚠️ Video {video_id} が見つかりません。")
            return

        video = response['items'][0]
        snippet = video['snippet']

        # 変更点を上書き
        snippet['title'] = title
        snippet['description'] = description
        if category_id:
            snippet['categoryId'] = category_id

        # 更新リクエストの送信
        update_request = youtube.videos().update(
            part="snippet,status",
            body=dict(
                snippet=snippet,
                status=video['status'],
                id=video_id
            )
        )
        update_response = update_request.execute()
        print(f"✅ 動画の更新に成功しました: {title} (ID: {video_id})")
        
    except googleapiclient.errors.HttpError as e:
        print(f"❌ エラーが発生しました (ID: {video_id}):\n{e.content}")

def main():
    print("YouTube API の認証を開始します...")
    youtube = get_authenticated_service()
    
    print("books.yaml を読み込んでいます...")
    with open('books/youtube/books.yaml', 'r', encoding='utf-8') as f:
        books = yaml.safe_load(f)
        
    for book in books:
        # 日本語版の更新
        yt_ja = book.get('youtube_id_ja')
        if yt_ja:
            ja_desc_path = f"output/youtube_descriptions/{book['id']}_ja.txt"
            if os.path.exists(ja_desc_path):
                with open(ja_desc_path, 'r', encoding='utf-8') as f:
                    description = f.read()
                
                # タイトルの自動生成ルール（仮の実装。運用に合わせて変更可能）
                title_ja = f"「{book['title_ja']}」紹介動画 【ITエンジニア知識アーキテクチャ】"
                
                print(f"更新準備中 [JA]: {title_ja}")
                update_video(youtube, yt_ja, title_ja[:100], description) # YouTubeのタイトルは100文字制限

        # 英語版の更新
        yt_en = book.get('youtube_id_en')
        if yt_en:
            en_desc_path = f"output/youtube_descriptions/{book['id']}_en.txt"
            if os.path.exists(en_desc_path):
                with open(en_desc_path, 'r', encoding='utf-8') as f:
                    description = f.read()
                
                # 英語用タイトルの自動生成ルール
                raw_title_en = book.get('title_en', '') or book['id']
                title_en = f"'{raw_title_en}' Overview [IT Engineer Knowledge Architecture]"
                
                print(f"更新準備中 [EN]: {title_en}")
                update_video(youtube, yt_en, title_en[:100], description)

if __name__ == '__main__':
    main()
