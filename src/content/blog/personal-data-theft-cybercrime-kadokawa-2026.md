---
title: "盗まれた個人情報は、どこへ？ KADOKAWA事件から読み解くサイバー犯罪の目的と手口"
description: "KADOKAWA事件を入口に、個人情報を盗む犯罪者の目的と手口、窃取後の恐喝・転売を解説。14集団の国との関係と2022～2026年の被害統計を、公表資料から読み解きます。"
pubDate: "2026-10-12"
author: "ただの会社員"
categories: ["AI・DX"]
tags: ["サイバー攻撃", "個人情報漏えい", "KADOKAWA", "ランサムウェア"]
section: "ai-dx"
heroImage: "/images/ai-dx/personal-data-theft-cybercrime-kadokawa-2026/personal-data-theft-thumbnail.png"
---

<div class="cyber-article"><p>※本記事にはAmazon・楽天のアフィリエイト広告（PR）が含まれます。Amazonのアソシエイトとして、当ブログは適格販売により収入を得ています。</p>
<p>「個人情報が流出しました」。ニュースでこの言葉を目にしても、その後に何が起きるのかまでは見えにくいものです。</p>
<p>盗まれた情報は、企業を脅す材料になります。別の犯罪者に売られ、本人や取引先になりすます詐欺に使われることもあります。一方、国家に関係する攻撃では、情報を公表せず、外交・安全保障上の分析に利用する場合もあります。</p>
<p>つまり、漏えいは事件の終わりとは限りません。この記事ではKADOKAWA事件を入口に、<strong>誰が、何のために情報を盗み、盗んだ後にどう使うのか</strong>をたどります。後半では、2022～2026年の被害報告と感染経路をグラフで確認します。</p>
<aside class="takeaways">
<strong>この記事で分かること</strong>
<ul><li>情報窃取が「お金」と「情報収集」につながる仕組み</li><li>KADOKAWA事件で確認された被害と、公表情報の限界</li><li>14の集団・活動群と国との関係、統計を読み違えないポイント</li></ul>
</aside><nav aria-label="目次"><strong>この記事の目次</strong><ol><li><a href="#kadokawa">KADOKAWA事件で、何が起きたのか</a></li><li><a href="#_2">犯罪者にとって、個人情報にはどんな価値があるのか</a></li><li><a href="#_3">誰が盗むのか——集団名と「国」の関係</a></li><li><a href="#2026">グラフで見る被害——2026年は上半期まで</a></li><li><a href="#_5">「成功した攻撃」と「犯人がもうかった攻撃」は違う</a></li><li><a href="#_7">漏えいニュースを見たときに、確かめたいこと</a></li><li><a href="#2_1">理解を深める関連書籍2冊</a></li><li><a href="#_8">調査範囲・出典について</a></li></ol></nav>

<h2 id="kadokawa">KADOKAWA事件で、何が起きたのか</h2>
<p>2024年6月8日、KADOKAWAグループで複数のサーバーにアクセスできない障害が発生しました。調査の結果、ドワンゴ専用ファイルサーバーなどが、ランサムウェアを含む大規模なサイバー攻撃を受けたことが確認されています。</p>
<p>ランサムウェアは、データを暗号化するなどして利用できなくし、支払いを迫る攻撃に使われるソフトウェアです。さらにデータを盗み、「公開されたくなければ支払え」と迫る恐喝が組み合わされることもあります。</p>
<p>KADOKAWAの会社発表では、経路・方法は不明としながらも、フィッシングなどによって従業員のアカウント情報が盗まれたことが根本原因と推測されています。盗まれた認証情報による侵入が、ランサムウェアの実行と個人情報の漏えいにつながりました。<a href="https://group.kadokawa.co.jp/information/media-download/1356/d3f77b589c58d083/" target="_blank" rel="noopener">会社の調査報告（2024年8月5日）</a></p>
<p>漏えい対象は当初の254,241人から、追加調査を経て<strong>261,956人</strong>へ更新されました。2024年11月7日の会社決算資料に記載された、同月1日時点の人数です。追加分は新たな調査で判明したもので、新しい攻撃があったという意味ではありません。<a href="https://investgame.net/news/pdf/kadokawa-corp-fy2024-q2-earnings-release/" target="_blank" rel="noopener">会社決算資料の転載</a></p>
<h3 id="_1">「被害額」は、一つの数字では表せない</h3>
<p>会社は2025年3月期について、サイバー攻撃による売上高へのマイナス影響を83億円、営業利益へのマイナス影響を47億円、関連特別損失を24億円と公表しました。</p>
<p>ここで83＋47＋24と足すと、異なる性質の指標を混ぜてしまいます。売上の減少、利益への影響、特別損失はそれぞれ分けて読む必要があります。また、これらは身代金の支払額を示す数字でもありません。<a href="https://www.kadokawa.co.jp/topics/13832/" target="_blank" rel="noopener">KADOKAWAの通期決算公表</a></p>
<p>この事件についてはBlackSuitが犯行を主張しています。ただし、犯行声明と、捜査による実行者・所在国の確定は別です。米司法省は2025年、BlackSuit/Royalの関連インフラの摘発を公表しましたが、関係者全員の活動が消滅したとまではいえません。<a href="https://www.ipa.go.jp/publish/wp-security/j5u9nn0000006yf6-att/iswp2025_ALL.pdf" target="_blank" rel="noopener">IPA『情報セキュリティ白書2025』</a>、<a href="https://www.justice.gov/usao-dc/pr/justice-department-announces-coordinated-actions-disrupt-operations-blacksuit-royal" target="_blank" rel="noopener">米司法省</a></p>
<h2 id="_2">犯罪者にとって、個人情報にはどんな価値があるのか</h2>
<p>情報の価値は、名簿そのものの販売価格だけでは決まりません。「誰に、どのような圧力をかけられるか」「何になりすませるか」「何を知ることができるか」が重要になります。</p>
<h3 id="1">1. 企業を脅して支払いを求める</h3>
<p>顧客情報、従業員の情報、契約書などを盗み、一部を証拠として示して、非公開や削除を条件に支払いを要求します。暗号化による業務停止まで重なれば、企業は復旧と情報流出への対応を同時に迫られます。</p>
<h3 id="2">2. データや侵入済みアカウントを売る</h3>
<p>最初に侵入した人物が、最後まで恐喝や詐欺を実行するとは限りません。盗んだ情報や侵入した環境へのアクセスを、別の犯罪者に渡す分業もあります。公開されたShinyHunters関連活動の分析では、侵入と恐喝を別の活動群として追跡する例が示されています。<a href="https://cloud.google.com/blog/topics/threat-intelligence/expansion-shinyhunters-saas-data-theft" target="_blank" rel="noopener">Googleの調査</a></p>
<h3 id="3">3. 次の詐欺や乗っ取りに使う</h3>
<p>氏名とメールアドレスだけでなく、勤務先や取引関係まで知られていれば、「あなたに関係がある連絡」に見せかけやすくなります。実際にKADOKAWAも、流出した個人情報を使うフィッシングや詐欺メールへの注意を呼びかけています。<a href="https://group.kadokawa.co.jp/information/media-download/1356/d3f77b589c58d083/" target="_blank" rel="noopener">会社の注意喚起</a></p>
<h3 id="4">4. 国家の情報収集や威圧に使う</h3>
<p>外交・研究・通信に関する情報を集める活動もあります。例えば警察庁はMirrorFaceについて、中国の関与が疑われ、日本の安全保障や先端技術に関する情報窃取を目的とした活動と評価しています。米司法省はHandala関連サイトを、イラン情報省による情報公開・心理作戦と関連づけています。<a href="https://www.npa.go.jp/bureau/cyber/koho/caution/caution20250108.html" target="_blank" rel="noopener">警察庁</a>、<a href="https://www.justice.gov/usao-md/pr/justice-department-disrupts-iranian-cyber-enabled-psychological-operations" target="_blank" rel="noopener">米司法省</a></p>
<h2 id="_3">誰が盗むのか——集団名と「国」の関係</h2>
<p>金銭目的の犯罪集団と、国家に関係する情報収集組織は、目的も活動も異なります。しかも、運営者、実行役、協力者が複数の国にまたがる場合があります。</p>
<p>代表例を挙げると、LockBitはロシアの運営者との関係が当局によって特定され、APT28はロシア軍情報機関に関連づけられています。中国との関連が指摘される活動にはMirrorFaceやSalt Typhoon、北朝鮮との関連ではTraderTraitorやKimsukyがあります。</p>
<p>Scattered SpiderやShinyHuntersのように、容疑者の国籍・居住地が判明していても、それだけで集団全体の「国」を決められない例もあります。名称が日本語に見えるAkiraを、日本の集団と判断することもできません。</p>
<details class="groups"><summary>14の集団・活動群と帰属根拠を見る</summary><div class="table-scroll"><table>
<thead>
<tr>
<th>国・地域との関係</th>
<th>集団名</th>
<th>主な目的・盗む情報</th>
<th>手口の概略と確認状況</th>
</tr>
</thead>
<tbody>
<tr>
<td>ロシア：運営者の帰属をNCAが特定</td>
<td><strong>LockBit</strong></td>
<td>身代金・非公開と引き換えの恐喝。企業・顧客情報</td>
<td>開発側と実行側が分業するランサムウェア事業。2024年の摘発後も、2025年IC3で被害申告の対象。摘発＝全活動停止ではない。<a href="https://www.nationalcrimeagency.gov.uk/news/lockbit-leader-unmasked-and-sanctioned" target="_blank" rel="noopener">NCA</a>、<a href="https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf" target="_blank" rel="noopener">IC3 2025</a></td>
</tr>
<tr>
<td>ロシア語圏との関連を推定。所在地断定不可</td>
<td><strong>Qilin / Agenda</strong></td>
<td>データ窃取と恐喝、暗号化による支払い圧力</td>
<td>HHSはロシア起源・ロシア語話者の可能性を記載。Microsoftは2026年9月にも実行者によるQilin展開を報告。<a href="https://www.hhs.gov/sites/default/files/qilin-threat-profile-tlpclear.pdf" target="_blank" rel="noopener">HHS</a>、<a href="https://www.microsoft.com/en-us/security/blog/2026/09/24/beyond-ransomware-tracking-storm-2570-consistent-tradecraft-across-deployments/" target="_blank" rel="noopener">Microsoft 2026-09-24</a></td>
</tr>
<tr>
<td>ロシア軍情報機関GRU</td>
<td><strong>APT28 / Fancy Bear</strong></td>
<td>外交・軍事情報、メール・認証情報の収集</td>
<td>脆弱なルーターの悪用等。英国が2026年4月に活動を公表。国家諜報型。<a href="https://www.ncsc.gov.uk/news/uk-exposes-russian-military-intelligence-hijacking-vulnerable-routers-for-cyber-attacks" target="_blank" rel="noopener">NCSC</a></td>
</tr>
<tr>
<td>中国の関与が疑われる：警察庁評価</td>
<td><strong>MirrorFace / Earth Kasha</strong></td>
<td>日本の安全保障・先端技術に関連する情報</td>
<td>標的型メール、公開機器の脆弱性悪用等。2025年1月の警察庁公表で帰属評価を確認。国家諜報型。<a href="https://www.npa.go.jp/bureau/cyber/koho/caution/caution20250108.html" target="_blank" rel="noopener">警察庁</a></td>
</tr>
<tr>
<td>中国に関連：各国政府の共同評価</td>
<td><strong>Salt Typhoon</strong></td>
<td>通信・ネットワーク情報等の諜報</td>
<td>通信事業者等のネットワーク機器への侵入。2025年8月の共同注意喚起で関連活動・企業を公表。名称の追跡範囲は各機関で完全一致しない。<a href="https://www.ncsc.gov.uk/news/uk-allies-expose-china-tech-companies-enabling-cyber-campaign" target="_blank" rel="noopener">英国NCSC</a></td>
</tr>
<tr>
<td>北朝鮮：警察庁・FBIが特定</td>
<td><strong>TraderTraitor</strong>（Lazarus関連として扱われる活動群）</td>
<td>暗号資産・送金を操作できる認証情報。資金獲得</td>
<td>採用担当者等へのなりすまし、取引関係者への侵入。DMM Bitcoin事件を2024年12月、Bybit事件を2025年2月に当局が帰属。全てのLazarus活動と同一視しない。<a href="https://www.npa.go.jp/bureau/cyber/koho/caution/caution20241224.html" target="_blank" rel="noopener">警察庁</a>、<a href="https://www.fbi.gov/investigate/cyber/alerts/2025/north-korea-responsible-for-1-5-billion-bybit-hack" target="_blank" rel="noopener">FBI</a></td>
</tr>
<tr>
<td>北朝鮮：FBI評価</td>
<td><strong>Kimsuky</strong></td>
<td>政策・外交関連の情報、研究者等のアカウント</td>
<td>標的型フィッシング。2026年1月にQRコードを使った誘導をFBIが公表。主に情報収集型。<a href="https://www.ic3.gov/CSA/2026/260108.pdf" target="_blank" rel="noopener">FBI 2026-01-08</a></td>
</tr>
<tr>
<td>イラン情報省との関連：米司法省評価</td>
<td><strong>Handala Hack</strong></td>
<td>窃取情報の公開、威圧・心理作戦</td>
<td>ハッキングで得た機微情報をサイトに掲載。2026年3月に関連ドメインが差し押さえられた。金銭だけでは説明できない活動。<a href="https://www.justice.gov/usao-md/pr/justice-department-disrupts-iranian-cyber-enabled-psychological-operations" target="_blank" rel="noopener">米司法省</a></td>
</tr>
<tr>
<td>多国籍：米国・エストニア二重国籍の容疑者を確認</td>
<td><strong>Scattered Spider / UNC3944 / Octo Tempest</strong></td>
<td>企業への恐喝、個人・業務情報の窃取</td>
<td>社員やサポート担当を欺きアカウントを侵害。2026年7月に容疑者の米国送還を公表。国欄は容疑者属性であり、集団の本拠地を断定しない。<a href="https://www.justice.gov/opa/pr/alleged-member-criminal-cyber-hacking-group-scattered-spider-arrested-finland-and-extradited" target="_blank" rel="noopener">米司法省</a>、<a href="https://www.cyber.gov.au/advisory/scattered-spider" target="_blank" rel="noopener">共同助言</a></td>
</tr>
<tr>
<td>多国籍・全体所在地不明：オランダ在住容疑者</td>
<td><strong>ShinyHunters</strong></td>
<td>顧客データの窃取・販売・非公開を条件とする恐喝</td>
<td>SaaSアカウントへの侵入とデータ持ち出し。Googleが2026年1月に分析、オランダ警察が9月に逮捕を公表。居住地と国籍は同じではない。<a href="https://cloud.google.com/blog/topics/threat-intelligence/expansion-shinyhunters-saas-data-theft" target="_blank" rel="noopener">Google</a>、<a href="https://www.politie.nl/nieuws/2026/september/29/11-verdachte-aangehouden-in-onderzoek-naar-hackersgroep-shinyhunters.html" target="_blank" rel="noopener">オランダ警察</a></td>
</tr>
<tr>
<td>国を確定できない</td>
<td><strong>Akira</strong></td>
<td>暗号化と窃取による恐喝</td>
<td>2025年IC3の主要な被害申告対象。名称から日本の集団とは判断できない。<a href="https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf" target="_blank" rel="noopener">IC3 2025</a></td>
</tr>
<tr>
<td>国を確定できない</td>
<td><strong>Medusa</strong></td>
<td>身代金・情報公開を使った恐喝</td>
<td>2025年の共同助言とIC3で確認。フィッシングや脆弱性悪用など。<a href="https://www.cisa.gov/sites/default/files/2025-03/aa25-071a-stopransomware-medusa-ransomware.pdf" target="_blank" rel="noopener">CISA/FBI/MS-ISAC</a></td>
</tr>
<tr>
<td>国を確定できない</td>
<td><strong>DragonForce</strong></td>
<td>ランサムウェアによる恐喝</td>
<td>2026年9月のMicrosoftの観測で利用を確認。実行者が複数のランサムウェアを使い分ける例があり、製品名から実行者の国は決められない。<a href="https://www.microsoft.com/en-us/security/blog/2026/09/24/beyond-ransomware-tracking-storm-2570-consistent-tradecraft-across-deployments/" target="_blank" rel="noopener">Microsoft</a></td>
</tr>
<tr>
<td>KADOKAWA事件の実行者の国は未確定</td>
<td><strong>BlackSuit / Royal</strong></td>
<td>暗号化・窃取情報の公開を使った恐喝</td>
<td>BlackSuitがKADOKAWAへの犯行を主張。2025年7月にインフラを摘発。2026年現在も同じ体制で活動中とは確認できない。<a href="https://www.ipa.go.jp/publish/wp-security/j5u9nn0000006yf6-att/iswp2025_ALL.pdf" target="_blank" rel="noopener">IPA白書</a>、<a href="https://www.justice.gov/usao-dc/pr/justice-department-announces-coordinated-actions-disrupt-operations-blacksuit-royal" target="_blank" rel="noopener">米司法省</a></td>
</tr>
</tbody>
</table></div></details>

<h3 id="ip">攻撃元のIPが米国でも、犯人が米国にいるとは限らない</h3>
<p>攻撃者は、借りたサーバーや侵害したルーターなどを経由できます。通信の送信元IPの国と、実行者の国籍・居住地・国家関与は、別々の情報です。</p>
<p>このため本記事では、送信元IPのランキングを「犯人の国別ランキング」として扱っていません。また、国別の全攻撃件数・成功率・被害総額を同じ基準で比較できる公開統計は、今回確認できませんでした。<a href="https://www.npa.go.jp/publications/statistics/cybersecurity/data/R8kami/R08_kami_cyber_jousei.pdf" target="_blank" rel="noopener">警察庁の情勢資料</a></p>
<h2 id="2026">グラフで見る被害——2026年は上半期まで</h2>
<p>まず、日本の警察に報告されたランサムウェア被害を見てみましょう。<strong>サイバー攻撃全体の試行回数でも、個人情報漏えいだけの件数でもありません。</strong></p>
<p><img alt="日本のランサムウェア被害報告件数。2022年230件、2023年197件、2024年222件、2025年226件、2026年上半期123件。" src="/images/ai-dx/personal-data-theft-cybercrime-kadokawa-2026/incidents.png" /></p>
<p>2026年上半期は123件。前年同期の116件から約6.0%増えています。2026年の棒が低く見えるのは、下半期を含まないためです。通年の2025年と単純に比較して「減った」とは読めません。<a href="https://www.npa.go.jp/publications/statistics/cybersecurity/data/R8kami/R08_kami_cyber_jousei.pdf" target="_blank" rel="noopener">警察庁2026年上半期報告</a></p>
<h3 id="_4">入口は、外から接続できる機器やアカウント</h3>
<p><img alt="ランサムウェアの感染経路。VPN機器、リモートデスクトップ、不審メール・添付、その他を年別に表示。" src="/images/ai-dx/personal-data-theft-cybercrime-kadokawa-2026/routes.png" /></p>
<p>2026年上半期に感染経路について有効回答があった36件では、VPN機器が18件、リモートデスクトップが9件でした。両方で75%を占めます。</p>
<p>ただし「VPN経由＝機器の脆弱性が原因」とは限りません。盗まれた認証情報の悪用も考えられます。また、この回答集合で不審メールが0件だったことは、社会全体でフィッシングがなくなったことを意味しません。集計の対象と母数を一緒に読むことが大切です。<a href="https://www.npa.go.jp/publications/statistics/cybersecurity/data/R8kami/R08_kami_cyber_jousei.pdf" target="_blank" rel="noopener">警察庁同報告・本文143頁</a></p>
<h2 id="_5">「成功した攻撃」と「犯人がもうかった攻撃」は違う</h2>
<p>侵入に成功しても、情報を持ち出せない場合があります。情報を持ち出しても、恐喝金を得られるとは限りません。</p>
<p>Scattered Spiderについて米司法省が2026年7月に公表した事件では、企業への侵入とデータ窃取があった一方、身代金は支払われなかったと説明されています。それでも、事業の中断・調査・対処の損失は発生しました。<a href="https://www.justice.gov/opa/pr/alleged-member-criminal-cyber-hacking-group-scattered-spider-arrested-finland-and-extradited" target="_blank" rel="noopener">米司法省の事件説明</a></p>
<p>「侵入」「窃取」「暗号化」「金銭獲得」のどれを成功とするかで、件数の意味は変わります。失敗した試行を含む分母も分からなければ、成功率は計算できません。</p>
<h3 id="_6">身代金がなくても、復旧には費用がかかる</h3>
<p><img alt="日本のランサムウェア被害に伴う復旧・調査費用の回答分布。" src="/images/ai-dx/personal-data-theft-cybercrime-kadokawa-2026/recovery-costs.png" /></p>
<p>警察庁の2026年上半期の調査では、費用について回答があった35件のうち、1,000万円以上が21件、60%でした。ただし、これは回答した被害組織の結果で、日本全体にそのまま当てはめられる割合ではありません。<a href="https://www.npa.go.jp/publications/statistics/cybersecurity/data/R8kami/R08_kami_cyber_jousei.pdf" target="_blank" rel="noopener">警察庁同報告・本文145頁</a></p>
<p><img alt="FBI IC3へのランサムウェア申告件数と申告損失。2026年通年は未公表。" src="/images/ai-dx/personal-data-theft-cybercrime-kadokawa-2026/ic3-losses.png" /></p>
<p>FBI IC3への2025年のランサムウェア申告は3,611件、申告損失は約3,232万米ドルでした。この損失額は通常、休業や第三者による復旧サービスなどを含まず、未申告もあります。「世界の被害総額」ではなく、限定された範囲の申告額です。<a href="https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf" target="_blank" rel="noopener">FBI IC3 2025年報告</a></p>
<h2 id="_7">漏えいニュースを見たときに、確かめたいこと</h2>
<p>次に漏えいのニュースを見たら、人数の大きさだけでなく、次の3点に注目してみてください。</p>
<ol>
<li><strong>何が漏れたのか。</strong> 氏名・連絡先、認証情報、契約書など、情報の種類でその後のリスクが変わります。</li>
<li><strong>誰が確認した事実なのか。</strong> 被害企業の調査結果、捜査機関の帰属評価、犯罪者の犯行主張を区別します。</li>
<li><strong>数字は何を数えているのか。</strong> 攻撃回数、被害組織数、漏えい人数、身代金、復旧費用を混ぜずに読みます。</li>
</ol>
<p>盗まれた情報には、恐喝の材料、転売する商品、詐欺の準備、諜報の手がかりという複数の行き先があります。その行き先まで意識すると、サービスが復旧した後にも情報流出への対応が続く理由が見えてきます。</p>
<h2 id="2_1">理解を深める関連書籍2冊</h2>
<p>技術の仕組みと、国家・社会との関係を補う2冊を選びました。以下の紹介は出版社の内容紹介・目次に基づくもので、本記事の2026年の事件や統計を裏づける資料ではありません。</p>
<section class="book"><span class="eyebrow">READING 01</span><h3>サイバー攻撃 ネット世界の裏側で起きていること</h3><img class="book-cover" src="https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/0456/9784065020456_1_5.jpg?_ex=240x240" alt="サイバー攻撃 ネット世界の裏側で起きていることの表紙" loading="lazy" width="120" height="180"><p class="byline">中島明日香 著｜講談社・ブルーバックス｜2018年</p><p>ソフトウェアの脆弱性が生まれる理由と、攻撃・対策の関係を知りたい方に。技術的な話題も含むため、基礎を一歩掘り下げたい読者向けです。2018年刊行であり、最新の事件動向を追うための本ではありません。</p><div class="buttons"><a href="https://www.amazon.co.jp/s?k=9784065020456&tag=investinsight-22" target="_blank" rel="nofollow sponsored noopener">Amazonで探す</a><a href="https://hb.afl.rakuten.co.jp/ichiba/537f9a99.a6f93e32.537f9a9a.87376d2c/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fbook%2F15288425%2F&link_type=hybrid_url&ut=eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJoeWJyaWRfdXJsIiwic2l6ZSI6IjI0MHgyNDAiLCJuYW0iOjEsIm5hbXAiOiJyaWdodCIsImNvbSI6MSwiY29tcCI6ImRvd24iLCJwcmljZSI6MSwiYm9yIjoxLCJjb2wiOjEsImJidG4iOjEsInByb2QiOjAsImFtcCI6ZmFsc2V9" target="_blank" rel="nofollow sponsored noopener">楽天ブックスで見る</a></div><p class="source"><a href="https://www.kodansha.co.jp/titles/1000024483" target="_blank" rel="noopener">出版社の紹介</a> ／ ISBN 9784065020456</p></section>
<section class="book"><span class="eyebrow">READING 02</span><h3>サイバースペースの地政学</h3><img class="book-cover" src="https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/0269/9784153400269_1_3.jpg?_ex=240x240" alt="サイバースペースの地政学の表紙" loading="lazy" width="120" height="180"><p class="byline">小宮山功一朗・小泉悠 著｜早川書房・ハヤカワ新書｜2024年</p><p>データセンターや海底ケーブルなど、インターネットを支える実物のインフラから安全保障を考える一冊。「サイバー空間と国はどう結びつくのか」を深めたい方に向いています。</p><div class="buttons"><a href="https://www.amazon.co.jp/s?k=9784153400269&tag=investinsight-22" target="_blank" rel="nofollow sponsored noopener">Amazonで探す</a><a href="https://hb.afl.rakuten.co.jp/ichiba/537f9a99.a6f93e32.537f9a9a.87376d2c/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fbook%2F17871782%2F&link_type=hybrid_url&ut=eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJoeWJyaWRfdXJsIiwic2l6ZSI6IjI0MHgyNDAiLCJuYW0iOjEsIm5hbXAiOiJyaWdodCIsImNvbSI6MSwiY29tcCI6ImRvd24iLCJwcmljZSI6MSwiYm9yIjoxLCJjb2wiOjEsImJidG4iOjEsInByb2QiOjAsImFtcCI6ZmFsc2V9" target="_blank" rel="nofollow sponsored noopener">楽天ブックスで見る</a></div><p class="source"><a href="https://www.hayakawa-online.co.jp/shop/g/g0000240026/" target="_blank" rel="noopener">出版社の紹介</a> ／ ISBN 9784153400269</p></section>

<h2 id="_8">調査範囲・出典について</h2>
<p>本記事の調査基準日は2026年10月12日です。政府・警察・被害企業・直接調査を行ったセキュリティ企業の公開資料を優先しました。国・地域との関係は資料上の評価を示し、犯罪集団の全構成員の国籍や、調査日当日の活動継続を断定するものではありません。容疑者の逮捕・起訴は有罪確定を意味しません。</p>
<p>年次グラフは警察庁とFBI IC3の資料から作成しています。2026年の国内統計は上半期のみ、IC3の2026年通年値は未公表です。図の欠測を0として扱わず、通年への推計もしていません。</p>
<p><a href="https://www.npa.go.jp/publications/statistics/cybersecurity/index.html" target="_blank" rel="noopener">警察庁・統計資料一覧</a> ／ <a href="https://www.ic3.gov/AnnualReport/Reports/2022_IC3Report.pdf" target="_blank" rel="noopener">IC3 2022</a> ／ <a href="https://www.ic3.gov/AnnualReport/Reports/2023_IC3Report.pdf" target="_blank" rel="noopener">IC3 2023</a> ／ <a href="https://www.ic3.gov/AnnualReport/Reports/2024_IC3Report.pdf" target="_blank" rel="noopener">IC3 2024</a> ／ <a href="https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf" target="_blank" rel="noopener">IC3 2025</a></p>
</div>

<style>.book .book-cover{display:block;width:120px;height:180px;object-fit:contain;margin:16px 0;border:0;border-radius:0}.cyber-article aside,.cyber-article nav{background:#edf5f7;padding:20px;border-radius:8px;margin:24px 0}.cyber-article .table-scroll{overflow-x:auto}.cyber-article table{min-width:760px;font-size:14px}.cyber-article summary{cursor:pointer;background:#edf5f7;padding:18px;font-weight:bold}.cyber-article .book{border:1px solid #cbdce2;border-radius:10px;padding:24px;margin:24px 0}.cyber-article .buttons{display:flex;gap:12px;flex-wrap:wrap}.cyber-article .buttons a{display:inline-block;padding:12px 20px;background:#16798a;color:white;border-radius:5px;text-decoration:none}.cyber-article .buttons a+a{background:#a73442}.cyber-article .byline,.cyber-article .source{font-size:13px}.cyber-article img{max-width:100%;height:auto}.cyber-article .eyebrow{font-size:12px;color:#16798a}.cyber-article a{overflow-wrap:anywhere}</style>