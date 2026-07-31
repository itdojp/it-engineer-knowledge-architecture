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

    def test_update_path_uses_only_canonical_video_ids(self):
        books = update_youtube_videos.load_video_inventory()
        observed = []

        def record_update(_youtube, video_id, _title, _description, category_id=None):
            observed.append(video_id)
            return True

        with patch.object(update_youtube_videos, 'update_video', side_effect=record_update):
            with redirect_stdout(io.StringIO()):
                failures = update_youtube_videos.update_all(object(), books, self.description_dir)

        expected = [
            video_id
            for book in self.youtube['books']
            for video_id in (book['video_ja_id'], book['video_en_id'])
        ]
        self.assertEqual(failures, [])
        self.assertEqual(observed, expected)
        self.assertEqual(len(set(observed)), 84)

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
