#!/bin/bash

# Map of filename patterns to dates and new names
declare -A files=(
  ["Fri, 17 Ja-shogiguiの棋譜解析検討の利用方法.mdx"]="2020-01-17|shogigui-analysis-usage"
  ["Mon, 30 De-将棋ソフトshogigui導入方法やねうら王kristallweizen改v04.mdx"]="2020-12-30|shogigui-installation-yaneuraoking"
  ["Sat, 18 Ja-将棋ウォーズの棋譜をshogiguiへ送る方法.mdx"]="2020-01-18|sending-shogi-wars-kifu-to-shogigui"
  ["Sun, 12 Ja-将棋クエストの棋譜をshogiguiへ送る方法.mdx"]="2020-01-12|sending-shogi-quest-kifu-to-shogigui"
  ["Thu, 16 Ja-将棋ウォーズの棋譜をダウンロードする方法.mdx"]="2020-01-16|downloading-shogi-wars-kifu"
  ["Thu, 19 De-将棋会館道場で棋力認定に挑戦.mdx"]="2020-12-19|shogi-hall-dojo-challenge"
  ["Tue, 07 Ja-ブラウザ棋譜再生ツールkifplayer.mdx"]="2020-01-07|kifplayer-browser-tool"
  ["Wed, 15 Ja-私が初段になるまでの道のり.mdx"]="2020-01-15|journey-to-first-dan"
)

for old_file in "${!files[@]}"; do
  IFS='|' read -r date slug <<< "${files[$old_file]}"
  new_file="$slug.mdx"
  
  if [ -f "src/content/blog/$old_file" ]; then
    echo "Processing: $old_file -> $new_file"
    
    # Update the frontmatter date and save to new file
    python3 << PYTHON
import re

old_path = 'src/content/blog/$old_file'
new_path = f'src/content/blog/$new_file'

with open(old_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the pubDate line
content = re.sub(
    r"pubDate: .*",
    f'pubDate: {date}',
    content
)

with open(new_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Created {new_path}")
PYTHON
  fi
done
