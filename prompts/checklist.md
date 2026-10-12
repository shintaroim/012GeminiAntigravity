# 元プロンプトと実行用モジュールの整合性チェックリスト

本チェックリストは、正本（`docs/source-prompt-v1.0.md`）の全要件が、分割された各実行用モジュール（`prompts/*.md`）に抜け漏れなく保持されていることを確認するためのものです。

| 正本のセクション | 対応モジュール | 重要ルール・キーワード | 保持状況 |
|---|---|---|---|
| 【あなたの役割】 | `prompts/system.md` | 対話型人生編集者、本を書く話から始めない、30日で3つを残す、出版手続き・本文執筆は扱わない | ✅ 保持 |
| 【30日後に手元に残す3つのもの】 | `prompts/system.md`, `output-formats.md` | ①MY 7 STORIES ②MY 3 COMPASS ③BOOK SEED | ✅ 保持 |
| 【30日間の流れ】 | `prompts/system.md` | WEEK 1 話す、WEEK 2 寝かせる、WEEK 3 整える、WEEK 4 確かめる | ✅ 保持 |
| キーワード対応 | `prompts/system.md` | 「ほんね」「たたき台をまとめて」「整える」「BOOK SEEDをまとめて」「まとめて」「今どんな感じ？」 | ✅ 保持 |
| 【HON-NEoの基本思想】 | `prompts/philosophy.md` | 本音＝「今の私が、自分で選んだ、今の答え」、AIが人生を定義しない、人生のハンドルは常に本人が握る | ✅ 保持 |
| 【7 STORIESとは】 | `prompts/philosophy.md` | 人生の実績ではなく今の私をつくった物語、世間的な大小ではなく今の私につながっているか | ✅ 保持 |
| 【3 COMPASSとは】 | `prompts/philosophy.md` | 一般的な診断ではなく物語横断の選択基準、一語で終わらせず固有の定義と問いの形にする | ✅ 保持 |
| 【最初から7と3を考えさせない】 | `prompts/philosophy.md` | 7つや3つをいきなり聞かない、自由に話してもらい裏で素材を拾う | ✅ 保持 |
| 【最初の導入】 | `prompts/phases/speak.md` | 導入案内文、最初の問い「最近ふと、『このままでいいのかな』…」 | ✅ 保持 |
| 【対話の基本ルール】 | `prompts/conversation-rules.md` | 1ターン1問、直前の回答から選ぶ、同じ出来事を深く掘り下げる、空疎な称賛を避ける | ✅ 保持 |
| 【引っかかりを追う】 | `prompts/conversation-rules.md` | 繰り返し、感情、違和感、怒り・羨ましさ・後悔、矛盾、本人独特の表現 | ✅ 保持 |
| 【本人の原文を保存する】 | `prompts/conversation-rules.md` | 原文のまま保存、AIの言い換えを本人の発言として引用禁止 | ✅ 保持 |
| 【当たり前すぎる価値を探す】 | `prompts/conversation-rules.md` | 実績だけでなく普通と思っている経験を掘り下げる、才能と決めつけない | ✅ 保持 |
| 【周囲から見えていた自分】 | `prompts/conversation-rules.md` | 他人の評価をそのまま確定せず、なぜそうしたかまで掘り下げる | ✅ 保持 |
| 【感情から価値観を探す】 | `prompts/conversation-rules.md` | 嫉妬・怒り・モヤモヤ等を分解し価値観を探る | ✅ 保持 |
| 【外側の評価を外す】 | `prompts/conversation-rules.md` | 1円にもならなくても・役割を外したら何が残るか等の一問一答 | ✅ 保持 |
| 【人生の選び直し・過去の自分】 | `prompts/conversation-rules.md` | 人生をもう一度やっても選ぶか、消したい経験を美談化しない | ✅ 保持 |
| 【人生の領域を横断する】 | `prompts/conversation-rules.md` | 学校・家族・仕事・趣味等を横断し同一価値観が現れているか確認 | ✅ 保持 |
| 【内部で蓄積するもの】 | `prompts/conversation-rules.md` | 原文、エピソード、感情、仮説、反証、7 STORIES候補、COMPASS候補、否定語 | ✅ 保持 |
| 【まとめログ】 | `prompts/output-formats.md` | 約10往復に1回、【⚓ HON-NEoまとめログ】、「『それは違う』と思うところはありますか？」 | ✅ 保持 |
| 【選ばなかった言葉・反証】 | `prompts/conversation-rules.md` | 《選ばなかった言葉》を保存し再提示しない、反証となる反対側も探索 | ✅ 保持 |
| 【「話す」のたたき台】 | `prompts/phases/speak.md`, `output-formats.md` | たたき台フォーマット、1週間の寝かせ案内 | ✅ 保持 |
| 【寝かせる期間】 | `prompts/phases/rest.md` | 無理な深掘りをせず短く受け止め、整えるへ持ち越し | ✅ 保持 |
| 【「整える」の始め方】 | `prompts/phases/refine.md` | 「寝かせている間に、気づいたことや、『これはちょっと違うかも』と感じたことはありましたか？」 | ✅ 保持 |
| 【7つに絞る】 | `prompts/phases/refine.md` | 残す・外す・統合・分ける・差し替え、何を大切にして今ここにいるか | ✅ 保持 |
| 【出来事名を物語タイトルに】 | `prompts/phases/refine.md` | 出来事名から物語タイトルへ変換、3〜5案の提示、本人が選ぶ・却下する自由 | ✅ 保持 |
| 【7 STORIES最終フォーマット】 | `prompts/output-formats.md`, `refine.md` | STORY ○、《物語タイトル》、元になった出来事、7項目、原文、つながるCOMPASS | ✅ 保持 |
| 【3 COMPASSを見つける】 | `prompts/phases/refine.md`, `output-formats.md` | 根拠エピソード、本人固有の定義と迷ったときの問い、つながり確認 | ✅ 保持 |
| 【人生の再定義文】 | `prompts/phases/refine.md`, `output-formats.md` | 「私は、＿＿＿＿な人生を生きてきた。…」AIが複数案提示 | ✅ 保持 |
| 【BOOK SEED】 | `prompts/phases/book-seed.md`, `output-formats.md` | 7 STORIES、3 COMPASS、人生の再定義、次のタネ箱 | ✅ 保持 |
| 【本人の声を最優先する】 | `prompts/safety.md` | 美談化・感動演出・ポエム化・自己啓発結論の禁止、友人に話す言葉へ戻す | ✅ 保持 |
| 【安心して話してもらうために】 | `prompts/safety.md` | 個人情報不要、話したくないことの尊重、強い苦痛時は深掘り中止し専門窓口へ案内 | ✅ 保持 |
| 【完成の確認】 | `prompts/phases/book-seed.md` | 5条件揃うまで完成扱い禁止、本人の納得確認、最後の問い「これからあなたは何を選びますか？」 | ✅ 保持 |
| 【最終原則】 | `prompts/phases/book-seed.md` | 7つ・3つ・タイトルをAIが決めない、HON-NEo Be True, Be Free. | ✅ 保持 |
