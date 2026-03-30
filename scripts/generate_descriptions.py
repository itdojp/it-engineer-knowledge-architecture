import yaml
import os
import re

BOOKS_YAML = 'books/youtube/books.yaml'
TEMPLATE_JA = 'templates/youtube/description_ja.txt'
TEMPLATE_EN = 'templates/youtube/description_en.txt'
PROMPT_JA = 'templates/youtube/prompt_ja.txt'
PROMPT_EN = 'templates/youtube/prompt_en.txt'
OUTPUT_DIR = 'output/youtube_descriptions'
OUTPUT_PROMPT_DIR = 'output/youtube_prompts'

def sanitize_tag(text):
    text = text.replace('（', '').replace('）', '').replace('・', '')
    return ''.join([c for c in text if c.isalnum()])

def mapping_en(text):
    if not text: return ""
    # カッコ書き（注釈）を削除してマッピングキーを正規化する
    key = re.sub(r'（.*?）|\(.*?\)', '', text).strip()
    
    mapping = {
        "技術基盤": "Professional Foundations",
        "基礎リテラシー": "Professional Foundations",
        "セキュリティ": "Security",
        "応用技術": "Applied Technologies",
        "特定技術・応用領域": "Applied Technologies",
        "コンピューターサイエンス理論": "Computer Science Theory",
        "開発運用プロセス": "Development & Operation",
        "開発・運用プロセス": "Development & Operation",
        "特定領域ドメイン知識": "Domain Specific Knowledge",
        "特定領域・ドメイン知識": "Domain Specific Knowledge",
        "ソフトスキル思考法": "Soft Skills & Mindset",
        "ソフトスキル・思考法": "Soft Skills & Mindset",
        "教養哲学": "Liberal Arts & Philosophy",
        "教養・哲学": "Liberal Arts & Philosophy",
        "Web3・ブロックチェーン": "Web3 & Blockchain",
        
        "全レベル": "All Levels",
        "未経験者": "Beginner",
        "初学者": "Beginner",
        "IT未経験者・初学者": "Beginner",
        "新人〜中級者": "Junior - Mid",
        "中級〜上級者": "Mid - Senior",
        "中級者以上": "Mid - Senior",
        "専門分野従事者": "Domain Experts"
    }
    # マッピング先があればそれを返し、なければ元のテキスト（正規化済またはそのまま）を英語として返す
    return mapping.get(key, key) or text

def generate():
    with open(BOOKS_YAML, 'r', encoding='utf-8') as f:
        books = yaml.safe_load(f)
        
    with open(TEMPLATE_JA, 'r', encoding='utf-8') as f:
        tmpl_ja = f.read()
        
    with open(TEMPLATE_EN, 'r', encoding='utf-8') as f:
        tmpl_en = f.read()
        
    with open(PROMPT_JA, 'r', encoding='utf-8') as f:
        prompt_tmpl_ja = f.read()
        
    with open(PROMPT_EN, 'r', encoding='utf-8') as f:
        prompt_tmpl_en = f.read()

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(OUTPUT_PROMPT_DIR, exist_ok=True)
    
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
            "{level_en}": mapping_en(level_ja),
            "{category_en}": mapping_en(cat_ja),
            "{url}": book.get('url', ''),
            "{repo}": book.get('repo', ''),
            "#{category_tag}": "#" + sanitize_tag(mapping_en(cat_ja)) if category_tag else "",
            "#{id_tag}": "#" + id_tag
        }

        # Generate JA
        text_ja = tmpl_ja
        for k, v in data_ja.items():
            text_ja = text_ja.replace(k, str(v))
            
        with open(os.path.join(OUTPUT_DIR, f"{book['id']}_ja.txt"), 'w', encoding='utf-8') as f:
            f.write(text_ja)

        # Generate EN
        text_en = tmpl_en
        for k, v in data_en.items():
            text_en = text_en.replace(k, str(v))
            
        with open(os.path.join(OUTPUT_DIR, f"{book['id']}_en.txt"), 'w', encoding='utf-8') as f:
            f.write(text_en)
            
        count += 2
        
        # Generate PROMPT JA
        p_text_ja = prompt_tmpl_ja
        for k, v in data_ja.items():
            p_text_ja = p_text_ja.replace(k, str(v))
            
        with open(os.path.join(OUTPUT_PROMPT_DIR, f"{book['id']}_prompt_ja.txt"), 'w', encoding='utf-8') as f:
            f.write(p_text_ja)

        # Generate PROMPT EN
        p_text_en = prompt_tmpl_en
        for k, v in data_en.items():
            p_text_en = p_text_en.replace(k, str(v))
            
        with open(os.path.join(OUTPUT_PROMPT_DIR, f"{book['id']}_prompt_en.txt"), 'w', encoding='utf-8') as f:
            f.write(p_text_en)
            
        prompt_count += 2

    print(f"Successfully generated {count} description files in {OUTPUT_DIR}")
    print(f"Successfully generated {prompt_count} prompt files in {OUTPUT_PROMPT_DIR}")

if __name__ == '__main__':
    generate()
