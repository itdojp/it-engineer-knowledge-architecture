import yaml
import os

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

def mapping_en(ja_text):
    mapping = {
        "未経験者向け": "Beginners",
        "基礎リテラシー": "Professional Foundations",
        "技術基盤基礎": "Basic Infrastructure",
        "技術基盤発展": "Advanced Infrastructure",
        "セキュリティ": "Security",
        "応用技術": "Applied Technologies",
        "コンピューターサイエンス理論": "Computer Science Theory",
        "開発運用プロセス": "Development & Operation",
        "特定領域ドメイン知識": "Domain Specific Knowledge",
        "ソフトスキル思考法": "Soft Skills & Mindset",
        "教養哲学": "Liberal Arts & Philosophy",
        "新人〜中級者": "Junior - Mid",
        "中級〜上級者": "Mid - Senior",
        "中級者以上": "Mid - Senior",
        "全レベル": "All Levels",
        "IT未経験者初学者": "IT Beginners",
        "専門分野従事者": "Domain Experts"
    }
    sanitized_ja = ja_text.replace('（', '').replace('）', '').replace('・', ' ').replace(' ', '')
    return mapping.get(sanitized_ja, ja_text)

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
        
        # tags
        category_tag = sanitize_tag(book.get('category', ''))
        id_tag = book.get('id').replace('-', '')

        data_ja = {
            "{hook_ja}": book.get('hook_ja', ''),
            "{title_ja}": book.get('title_ja', ''),
            "{level}": book.get('level', ''),
            "{category}": book.get('category', ''),
            "{url}": book.get('url', ''),
            "{repo}": book.get('repo', ''),
            "#{category_tag}": "#" + category_tag if category_tag else "",
            "#{id_tag}": "#" + id_tag
        }
        
        data_en = {
            "{hook_en}": book.get('hook_en', ''),
            "{title_en}": book.get('title_en', book.get('id')),
            "{level_en}": mapping_en(book.get('level', '')),
            "{category_en}": mapping_en(book.get('category', '')),
            "{url}": book.get('url', ''),
            "{repo}": book.get('repo', ''),
            "#{category_tag}": "#" + sanitize_tag(mapping_en(book.get('category', ''))) if category_tag else "",
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
