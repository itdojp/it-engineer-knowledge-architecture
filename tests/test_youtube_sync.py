import io
import json
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

import yaml


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))

import generate_descriptions  # noqa: E402
import update_youtube_videos  # noqa: E402


class YouTubeSyncContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.youtube = json.loads((ROOT / 'docs/_data/youtube.json').read_text(encoding='utf-8'))
        cls.temp_dir = tempfile.TemporaryDirectory()
        cls.description_dir = Path(cls.temp_dir.name) / 'descriptions'
        cls.prompt_dir = Path(cls.temp_dir.name) / 'prompts'
        generate_descriptions.generate(cls.description_dir, cls.prompt_dir)

    @classmethod
    def tearDownClass(cls):
        cls.temp_dir.cleanup()

    def test_description_inventory_covers_every_public_video_book(self):
        books = generate_descriptions.load_books()
        self.assertEqual([book['id'] for book in books], [book['book_id'] for book in self.youtube['books']])
        self.assertEqual(len(books), 42)
        catalog = json.loads((ROOT / 'docs/_data/catalog.json').read_text(encoding='utf-8'))
        catalog_by_id = {book['id']: book for book in catalog['books']}
        for book in books:
            catalog_book = catalog_by_id[book['id']]
            self.assertEqual(
                book['category_en'],
                generate_descriptions.CATEGORY_EN[catalog_book['category']],
            )
            self.assertEqual(
                book['level_en'],
                ' / '.join(generate_descriptions.LEVEL_EN[level] for level in catalog_book['levels']),
            )
            self.assertNotIn(book['hook_en'], generate_descriptions.REJECTED_HOOKS)
            if book['id'] in {'ai-agent-collaboration-book', 'BioinformaticsGuide-book'}:
                self.assertEqual(book['repo'], '')

    def test_generated_descriptions_are_complete_and_placeholder_free(self):
        books = update_youtube_videos.load_video_inventory()
        update_youtube_videos.validate_descriptions(books, self.description_dir)
        for book in books:
            for language in ('ja', 'en'):
                text = (self.description_dir / f"{book['book_id']}_{language}.txt").read_text(encoding='utf-8')
                self.assertNotRegex(text, r'\{(?:title|hook|url|repo|category|level)')
                self.assertNotRegex(text, r'#\{(?:category_tag|id_tag)\}')
                self.assertIn(self.youtube['meta']['playlists'][language]['url'], text)
                if book['book_id'] in {'ai-agent-collaboration-book', 'BioinformaticsGuide-book'}:
                    self.assertNotIn('GitHub Repository:', text)
                    self.assertNotIn('GitHubリポジトリ:', text)

    def test_playlist_url_substitution_replaces_stale_template_value(self):
        template = 'Playlist:\nhttps://www.youtube.com/playlist?list=STALE_VALUE\n'
        canonical_url = self.youtube['meta']['playlists']['en']['url']
        generated = generate_descriptions.apply_canonical_playlist_url(template, canonical_url)
        self.assertIn(canonical_url, generated)
        self.assertNotIn('STALE_VALUE', generated)

    def test_update_path_uses_canonical_video_ids_and_catalog_titles(self):
        books = update_youtube_videos.load_video_inventory()
        observed = []

        def record_update(_youtube, video_id, title, _description, category_id=None):
            observed.append((video_id, title))
            return True

        with patch.object(update_youtube_videos, 'update_video', side_effect=record_update):
            with redirect_stdout(io.StringIO()):
                failures = update_youtube_videos.update_all(object(), books, self.description_dir)

        catalog = json.loads((ROOT / 'docs/_data/catalog.json').read_text(encoding='utf-8'))
        catalog_by_id = {book['id']: book for book in catalog['books']}
        expected = []
        for book in self.youtube['books']:
            catalog_book = catalog_by_id[book['book_id']]
            canonical_book = {
                **book,
                'title_ja': catalog_book['title']['ja'],
                'title_en': catalog_book['title']['en'],
            }
            expected.extend((
                (
                    book['video_ja_id'],
                    update_youtube_videos.compose_video_title(canonical_book, 'ja'),
                ),
                (
                    book['video_en_id'],
                    update_youtube_videos.compose_video_title(canonical_book, 'en'),
                ),
            ))
        self.assertEqual(failures, [])
        self.assertEqual(observed, expected)
        self.assertEqual(len({video_id for video_id, _title in observed}), 84)
        for _video_id, title in observed:
            self.assertLessEqual(len(title), update_youtube_videos.MAX_VIDEO_TITLE_LENGTH)

        long_title_book = next(book for book in books if book['book_id'] == 'theoretical-computer-science-prerequisites-book')
        long_title = update_youtube_videos.compose_video_title(long_title_book, 'en')
        self.assertTrue(long_title.endswith(update_youtube_videos.TITLE_SUFFIX_EN))
        self.assertIn('…', long_title)

    def test_legacy_override_file_does_not_define_video_ids(self):
        text = (ROOT / 'books/youtube/books.yaml').read_text(encoding='utf-8')
        self.assertNotIn('youtube_id_ja:', text)
        self.assertNotIn('youtube_id_en:', text)
        self.assertNotIn('Are you struggling with ...?', text)

    def test_pull_request_workflow_is_validation_only(self):
        workflow = yaml.load(
            (ROOT / '.github/workflows/youtube_sync.yml').read_text(encoding='utf-8'),
            Loader=yaml.BaseLoader,
        )
        steps = workflow['jobs']['sync_youtube']['steps']
        steps_by_name = {step['name']: step for step in steps}
        for step_name in (
            'Check whether YouTube credentials are available',
            '2. Update YouTube Videos via API',
        ):
            self.assertIn("github.event_name != 'pull_request'", steps_by_name[step_name]['if'])


if __name__ == '__main__':
    unittest.main()
