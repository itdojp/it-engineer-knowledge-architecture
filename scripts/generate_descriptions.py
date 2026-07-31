import yaml
import os
import json
import re

BOOKS_YAML = 'books/youtube/books.yaml'
CATALOG_JSON = 'docs/_data/catalog.json'
YOUTUBE_JSON = 'docs/_data/youtube.json'
TEMPLATE_JA = 'templates/youtube/description_ja.txt'
TEMPLATE_EN = 'templates/youtube/description_en.txt'
PROMPT_JA = 'templates/youtube/prompt_ja.txt'
PROMPT_EN = 'templates/youtube/prompt_en.txt'
OUTPUT_DIR = 'output/youtube_descriptions'
OUTPUT_PROMPT_DIR = 'output/youtube_prompts'

DEFAULT_HOOK_JA = '本動画は、実務で必要とされる知識を体系的に深めたいエンジニアの方々に向けた解説です。'
DEFAULT_HOOK_EN = 'Explore the book overview, intended readers, and practical learning outcomes.'
REJECTED_HOOKS = {'Are you struggling with ...?'}
PLAYLIST_URL_PATTERN = re.compile(r'https://www\.youtube\.com/playlist\?list=[A-Za-z0-9_-]+')
REPOSITORY_SECTION_JA = '📦 GitHubリポジトリ:\n{repo}\n\n'
REPOSITORY_SECTION_EN = '📦 GitHub Repository:\n{repo}\n\n'

CATEGORY_JA = {
    'beginner-track': '未経験者向け',
    'professional-foundations': '基礎リテラシー（Professional Foundations）',
    'core-infra-foundations': '技術基盤（基礎）',
    'advanced-infra-practice': '技術基盤（発展）',
    'security': 'セキュリティ',
    'security-governance': 'セキュリティガバナンス',
    'applied-technologies': '応用技術',
    'computer-science-theory': 'コンピューターサイエンス理論',
    'development-delivery': '開発・運用プロセス',
    'domain-specific': '特定領域・ドメイン知識',
    'soft-skills-thinking': 'ソフトスキル・思考法',
    'liberal-arts-philosophy': '教養・哲学',
    'web3-blockchain': 'Web3・ブロックチェーン',
}

CATEGORY_EN = {
    'beginner-track': 'Beginner Track',
    'professional-foundations': 'Professional Foundations',
    'core-infra-foundations': 'Core Infrastructure Foundations',
    'advanced-infra-practice': 'Advanced Infrastructure Practice',
    'security': 'Security',
    'security-governance': 'Security Governance',
    'applied-technologies': 'Applied Technologies',
    'computer-science-theory': 'Computer Science Theory',
    'development-delivery': 'Development & Delivery',
    'domain-specific': 'Domain-Specific Knowledge',
    'soft-skills-thinking': 'Soft Skills & Thinking',
    'liberal-arts-philosophy': 'Liberal Arts & Philosophy',
    'web3-blockchain': 'Web3 & Blockchain',
}

LEVEL_JA = {
    'beginner': '初学者',
    'junior': '若手',
    'intermediate': '中級者',
    'advanced': '上級者',
    'all-levels': '全レベル',
}

LEVEL_EN = {
    'beginner': 'Beginner',
    'junior': 'Junior',
    'intermediate': 'Intermediate',
    'advanced': 'Advanced',
    'all-levels': 'All Levels',
}

def sanitize_tag(text):
    text = text.replace('（', '').replace('）', '').replace('・', '')
    return ''.join([c for c in text if c.isalnum()])

def apply_canonical_playlist_url(template, playlist_url):
    if not isinstance(playlist_url, str) or not playlist_url.startswith('https://www.youtube.com/playlist?list='):
        raise ValueError(f'invalid canonical playlist URL: {playlist_url!r}')
    if len(PLAYLIST_URL_PATTERN.findall(template)) != 1:
        raise ValueError('YouTube description template must contain exactly one playlist URL')
    return PLAYLIST_URL_PATTERN.sub(playlist_url, template, count=1)

def omit_repository_section(template, section):
    if section not in template:
        raise ValueError('YouTube description template is missing the expected repository section')
    return template.replace(section, '', 1)

def load_books():
    with open(BOOKS_YAML, 'r', encoding='utf-8') as f:
        overrides = yaml.safe_load(f) or []
    with open(CATALOG_JSON, 'r', encoding='utf-8') as f:
        catalog = json.load(f)
    with open(YOUTUBE_JSON, 'r', encoding='utf-8') as f:
        youtube = json.load(f)

    override_by_id = {}
    for override in overrides:
        book_id = override.get('id')
        if not book_id:
            raise ValueError('books/youtube/books.yaml contains a record without id')
        if book_id in override_by_id:
            raise ValueError(f'books/youtube/books.yaml contains duplicate id: {book_id}')
        if override.get('hook_ja') in REJECTED_HOOKS or override.get('hook_en') in REJECTED_HOOKS:
            raise ValueError(f'books/youtube/books.yaml contains an unfinished hook placeholder: {book_id}')
        override_by_id[book_id] = override

    published = sorted(
        (book for book in catalog.get('books', []) if book.get('status') == 'published'),
        key=lambda book: book['displayOrder']
    )
    published_ids = [book['id'] for book in published]
    video_ids = [book.get('book_id') for book in youtube.get('books', [])]
    if video_ids != published_ids:
        raise ValueError('docs/_data/youtube.json must cover published catalog books in displayOrder')

    unknown_overrides = sorted(set(override_by_id) - set(published_ids))
    if unknown_overrides:
        raise ValueError(f'books/youtube/books.yaml contains unknown or unpublished ids: {unknown_overrides}')

    books = []
    for catalog_book in published:
        book_id = catalog_book['id']
        override = override_by_id.get(book_id, {})
        expected_url = catalog_book['pagesUrl']
        expected_repo = f"https://github.com/{catalog_book['repo']}" if catalog_book.get('repoVisibility') == 'public' else ''

        category_ja = override.get('category') or CATEGORY_JA.get(catalog_book.get('category'), catalog_book.get('category', ''))
        category_en = override.get('category_en') or CATEGORY_EN.get(catalog_book.get('category'), catalog_book.get('category', ''))
        levels = catalog_book.get('levels', [])
        level_ja = override.get('level') or '・'.join(LEVEL_JA.get(level, level) for level in levels)
        level_en = override.get('level_en') or ' / '.join(LEVEL_EN.get(level, level) for level in levels)
        books.append({
            'id': book_id,
            'title_ja': catalog_book['title']['ja'],
            'title_en': catalog_book['title']['en'],
            'category': category_ja,
            'category_en': category_en,
            'level': level_ja,
            'level_en': level_en,
            'url': expected_url,
            'repo': expected_repo,
            'hook_ja': override.get('hook_ja') or DEFAULT_HOOK_JA,
            'hook_en': override.get('hook_en') or DEFAULT_HOOK_EN,
        })
    return books

def generate(output_dir=OUTPUT_DIR, output_prompt_dir=OUTPUT_PROMPT_DIR):
    books = load_books()
    with open(YOUTUBE_JSON, 'r', encoding='utf-8') as f:
        youtube = json.load(f)
        
    with open(TEMPLATE_JA, 'r', encoding='utf-8') as f:
        tmpl_ja = apply_canonical_playlist_url(f.read(), youtube['meta']['playlists']['ja']['url'])
        
    with open(TEMPLATE_EN, 'r', encoding='utf-8') as f:
        tmpl_en = apply_canonical_playlist_url(f.read(), youtube['meta']['playlists']['en']['url'])
        
    with open(PROMPT_JA, 'r', encoding='utf-8') as f:
        prompt_tmpl_ja = f.read()
        
    with open(PROMPT_EN, 'r', encoding='utf-8') as f:
        prompt_tmpl_en = f.read()

    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(output_prompt_dir, exist_ok=True)
    
    count = 0
    prompt_count = 0
    for book in books:
        if not book.get('id'): continue
        
        cat_ja = book.get('category', '')
        level_ja = book.get('level', '')
        
        # tags
        category_tag = sanitize_tag(cat_ja)
        id_tag = book.get('id').replace('-', '')

        data_ja = {
            "{hook_ja}": book.get('hook_ja', ''),
            "{title_ja}": book.get('title_ja', ''),
            "{level}": level_ja,
            "{category}": cat_ja,
            "{url}": book.get('url', ''),
            "{repo}": book.get('repo', ''),
            "#{category_tag}": "#" + category_tag if category_tag else "",
            "#{id_tag}": "#" + id_tag
        }
        
        data_en = {
            "{hook_en}": book.get('hook_en', ''),
            "{title_en}": book.get('title_en') or book.get('id') or book.get('title_ja', ''),
            "{level_en}": book.get('level_en', ''),
            "{category_en}": book.get('category_en', ''),
            "{url}": book.get('url', ''),
            "{repo}": book.get('repo', ''),
            "#{category_tag}": "#" + sanitize_tag(book.get('category_en', '')) if category_tag else "",
            "#{id_tag}": "#" + id_tag
        }

        # Generate JA
        text_ja = tmpl_ja if book.get('repo') else omit_repository_section(tmpl_ja, REPOSITORY_SECTION_JA)
        for k, v in data_ja.items():
            text_ja = text_ja.replace(k, str(v))
            
        with open(os.path.join(output_dir, f"{book['id']}_ja.txt"), 'w', encoding='utf-8') as f:
            f.write(text_ja)

        # Generate EN
        text_en = tmpl_en if book.get('repo') else omit_repository_section(tmpl_en, REPOSITORY_SECTION_EN)
        for k, v in data_en.items():
            text_en = text_en.replace(k, str(v))
            
        with open(os.path.join(output_dir, f"{book['id']}_en.txt"), 'w', encoding='utf-8') as f:
            f.write(text_en)
            
        count += 2
        
        # Generate PROMPT JA
        p_text_ja = prompt_tmpl_ja
        for k, v in data_ja.items():
            p_text_ja = p_text_ja.replace(k, str(v))
            
        with open(os.path.join(output_prompt_dir, f"{book['id']}_prompt_ja.txt"), 'w', encoding='utf-8') as f:
            f.write(p_text_ja)

        # Generate PROMPT EN
        p_text_en = prompt_tmpl_en
        for k, v in data_en.items():
            p_text_en = p_text_en.replace(k, str(v))
            
        with open(os.path.join(output_prompt_dir, f"{book['id']}_prompt_en.txt"), 'w', encoding='utf-8') as f:
            f.write(p_text_en)
            
        prompt_count += 2

    print(f"Successfully generated {count} description files in {output_dir}")
    print(f"Successfully generated {prompt_count} prompt files in {output_prompt_dir}")

if __name__ == '__main__':
    generate()
