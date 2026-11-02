# trainote の要件と設計

ボディメイクのための個人用ノート。日々の行動 (頑張ったこと = Win と、頑張れなかったこと = Slip) と体重を記録し、その記録を読んだ Claude に次のメニューや食事を相談し、週に一度振り返る。利用者は一人で、iPhone のホーム画面から毎日数十秒だけ開く。

この文書は 2026-10-24 から 25 にかけて設計を一問ずつ合意した結果である。10-26 に記録の対象を運動から行動全般に広げた。インデントが依存関係を表す。親の決定が変われば子の決定も見直す。末尾の「未決」が空になるまでは下書きである。

## 合意した設計

### 利用者と認証

- 利用者は一人。ただし users テーブルは持つ
  - 認証は Cloudflare Access + Google。Zero Trust の Login methods は Google だけで、許可するメールは `yamat47.thirddown@gmail.com` の 1 件
    - Worker は Access が付けた identity (メール) で users に upsert する。ログイン画面もセッション管理も書かない
    - ローカルでは wrangler の `access.dev` ブロックで identity を偽装する
    - Access の検証は `ctx.access.getIdentity()` を第一候補にし、hostname ベースの Access アプリで取れなければ `CF_Authorization` の JWT を `https://yamat47.cloudflareaccess.com/cdn-cgi/access/certs` で検証する (AUD は後述の outputs)
    - Access アプリのセッションは 730h。Access が許す最長の 1 か月で、Google を通るのは月に 1 回になる (2026-11-02、infra-yamat47 #72)
      - ホーム画面の Web アプリは Cookie とストレージを Safari と分けて持つ ([WWDC23 What's new in web apps](https://developer.apple.com/videos/play/wwdc2023/10120/))。Safari で Google にログインしていても PWA には効かず、トークンが切れるたびに PWA の中で Google を通る。24h のころは毎日 1 回挟まった
      - アプリドメインの `CF_Authorization` は、ポリシーに設定が無ければアプリのセッションに従う ([authorization cookie](https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/))。トークンの期限は発行時に決まり、使っても延びない。チームドメインのグローバルセッションは既定の 24h のまま Terraform の外に置く。アプリのトークンが切れてもグローバルが生きていれば Google を通らずに出し直される ([session management](https://developers.cloudflare.com/cloudflare-one/identity/users/session-management/)) が、アプリ側が 1 か月もつので延ばしても変わらない
      - Cookie は Access の応答の Set-Cookie で付くので、ITP が `document.cookie` の Cookie にかける 7 日の上限は届かない ([ITP 2.1](https://webkit.org/blog/8613/intelligent-tracking-prevention-2-1/))。24h のころリダイレクトが 1 日 1 回だったので、アプリを閉じても Cookie が期限まで残ることも観測している
      - 端末を失くすと最長 1 か月ログインしたままになる。Zero Trust のダッシュボードでアプリのトークンを失効させて切る

### 記録するもの

- v1 の対象は行動と体重。行動はボディメイクに向けた Win (頑張ったこと) と Slip (頑張れなかったこと) の 2 種で、Exercise、Food、Sleep、Life の 4 カテゴリに分ける
  - Slip は「一度滑っただけで失敗ではない」という行動療法の言葉。責めない姿勢を名前に込める
  - 食事のカロリーや睡眠時間は数値として記録しない。「お菓子を我慢した」「23 時に寝た」「お菓子を食べてしまった」のように行動を 1 件ずつ記録する
  - 入力は自由文だけ。種目を選ぶ UI も回数を入れる欄も作らない。1 回の入力に複数の行動を雑に書いてよい
    - Claude が Structured Outputs で 1 件ずつに分け、種別とカテゴリを付け、運動なら読み取れた範囲で種目と数値を切り出し、プレビューを出し、利用者が保存か修正を選ぶ
      - API は `POST /api/entries/preview` (構造化だけ。何も保存しない) と `POST /api/entries` (プレビューの行をそのまま送って保存)。サーバーはプレビューを覚えない。書き直した原文はただの次のプレビューになる。保存の日付は今日 (Asia/Tokyo) で、過去日付は未決のまま
      - スキーマは zod で 1 つ書き、`zodOutputFormat` で Structured Outputs に渡し、保存の検証にも同じものを使う。Structured Outputs は全項目を必須にするので、原文に無い数値は null
      - 本文はその行動を本人の言葉で短く書いたもの。`workout_items` に移した数値は本文から外す (「ベンチ60kg10回3セット」は本文「ベンチ」、行の下に「ベンチプレス 60 kg × 10 × 3」)。原文のままだと同じ数字が 2 回出るため
      - 入力欄 (textarea) には送信キーが無いので、文字があるときだけ入力欄の下に plain の「Read as entries」ボタンを出す。デザインの Notes 画面にはこの操作が無い。読めなかったときはボタンの上に赤の 1 行「Could not read your note. Try again.」、保存できなかったときはボタンの下に「Could not save. Try again.」
    - 修正は原文を書き直して構造化をやり直す。項目を直接直す画面は作らない。プレビュー中に入力欄を触っても同じ (プレビューが消えて書き直しに戻る)
    - プレビューには Claude の一言 (1 文まで) を添える。構造化と同じ呼び出しの JSON に 1 項目足すだけなので往復は増えない。2026-11-01 に実測した。`claude-sonnet-5-5` の effort low で、メモ 5 件のプレビューが 1.5 から 2.6 秒 (dev サーバー起動後の初回だけ 4.2 秒。Vite の初回変換を含む)。3 秒に収まるので一言は残し、モデルは `wrangler.jsonc` の var `STRUCTURE_MODEL` で差し替えられるようにした
  - 原文が一次記録。構造化した行は推移を出すためのもので、原文から取れなければ無くてよい
  - 運動は頑張ったことの一種で、種目ごとの数値を持てる
    - テーブルは `entries` (日付、種別 win / slip、カテゴリ、本文) と `workout_items` (entry_id、種目名、重量 kg、回数、セット、時間 分、距離 km。数値はすべて任意)
    - 行の粒度は原文に合わせて Claude が決める。「60kg 10 回 3 セット」は 1 行、「60kg で 10、8、6」は 3 行、「ジム行った」は行なし
    - 種目名は Claude が正規化する (「ベンチ」を「ベンチプレス」に)。種目マスタは v1 では持たない
  - 体重は行動とは別のオブジェクト。1 日 1 件 (日付で upsert)、kg 小数 1 桁。体脂肪率は任意列 (% 小数 1 桁)。行動の入力欄では体重を受けない
    - API は `PUT /api/weights/today` (今日の体重と任意の体脂肪率。同じ日にもう一度送ると上書き。日付はサーバーの Asia/Tokyo) と `GET /api/weights` (全件、新しい順、今日の日付つき)
    - Weight の先頭は Today (kg) と Body fat (%) の 2 行。今日の値があれば 2 行に入れておき (再入力は上書き)、どちらかに書き始めると右に Save が出て、体重が入っていれば押せる。読み込みが終わる前は Save を出さない (今朝の体脂肪率を知らずに消さないため)
    - 今日の値の横の「−0.8 kg this week」は、直近 7 日の平均と、その前 7 日の平均の差 (1 日の揺れで文が振れないように)。どちらかの 7 日に値が無ければ出さず、差が 0.0 なら「No change this week」。その下に「Averaging 64.5 kg and 18.5 % body fat over the last 7 days.」の 1 行 (直近 7 日に 2 件以上あるとき)
    - 期間は Segmented の W (7 日)、M (30 日)、6M (182 日)、Y (365 日)。グラフは期間内の日ごとの点をそのまま結ぶ (間引かない)。体重は `tint` の線で右の目盛、体脂肪率があれば `secondary-label` の細い線で左の目盛。目盛は丸い刻みで 5 本ほど。期間内に 2 日以上無ければグラフの代わりに「Weigh in on another day to see the graph.」
    - 目標体重と期限は Profile の Goal グループ (Goal weight の kg の行と By の日付の行、空にすれば消える)。目標があればグラフに `red` の破線「Goal 60.0」と、その下に「Goal 60.0 kg by Mar 31, 2027. 4.2 kg to go.」(届いていれば「Reached.」、期限が無ければ by を省く)。目標は減量の目標として読む (最新の体重が目標以下なら届いたとみなす)。増量の目標は未決。API は `GET /api/profile` と `PUT /api/profile/goal`
    - 全件のリスト (Show all entries) は月ごとの見出し (October、年が違えば October 2025) の下に、日付の行と体重、体脂肪率があれば副行に「Body fat 18.4 %」

### 振り返り

- 行動の一覧は日付降順で、日ごとにまとめる。各件は原文と種別の印 (Win は +、Slip は −) を出し、運動なら取れた種目の数値も添える。Win と Slip の言葉は絞り込みと週の文にだけ出す
  - 先頭に今週を月曜から日曜の 7 列で出す。各日に Win の数 (+2) と Slip の数 (−1) を並べ、何もない日は空ける。今日の曜日だけ tint。その下に「9 wins and 2 slips this week, 6 days in a row.」のような 1 文。これが Notes の顔
    - 週の文は通知と同じ形。連続が 1 日以下なら後半を落として「9 wins and 2 slips this week.」、両方 0 なら前半を「Nothing this week yet」にする (月曜の朝でも「Nothing this week yet, 6 days in a row.」と連続は見せる。深夜で切らないのと同じ理由)。初回でデータがないときはこの文と空の 7 列と入力欄だけで、一覧には何も出さない
    - API は `GET /api/entries` (全件、新しい順、items つき。件数が増えて重くなったら日付のカーソルを足す) と `GET /api/entries/week` (7 日分の数と連続日数と今日の日付)。今日と Today / Yesterday の判定はサーバーの Asia/Tokyo の日付で、端末の時計は使わない
    - 読み込めなかったときは週の文の場所に赤の 1 行「Could not load your notes.」と「Try again」のボタン。入力欄はそのまま使える
  - 連続記録日数は「行動を 1 件でも書いた日」が続いた数。体重だけの日は数えない。Slip だけの日でも途切れない。記録すること自体を習慣にする
    - 今日まだ書いていなくても昨日までの連続は切らない (夜に書く前提)。今日書けば今日から、書いていなければ昨日から遡って数える
  - 種別とカテゴリで絞れる。種目で絞ると推移が出る
- 週に 1 回、「Weekly review」を定型の相談として用意する
  - Coach タブのスレッド一覧に入口を置く。押すと新しいスレッドができ、定型の最初の発言 (今週の行動と体重を読んで、できたこと、つまずき、来週の方針を 1 つにまとめて) が送られ、Claude の返答がそのまま流れる
  - 毎週日曜 20:00 JST にプッシュ通知 (「Time for your weekly review?」) で知らせる。通知を押すと上と同じことが起きる
    - Web Push を使う。Worker の Cron Trigger (`triggers.crons` に UTC で `0 11 * * SUN`。Cloudflare の cron は曜日を 1 から 7 で数えるので 0 は通らない) が scheduled ハンドラで送る。購読は `push_subscriptions` (endpoint、p256dh、auth) に保存する。VAPID の秘密鍵は Worker の secret `VAPID_PRIVATE_KEY` (ローカルは `.dev.vars`)、公開鍵と subject は `wrangler.jsonc` の vars。鍵対は 1 組で、開発と本番で同じ
      - 購読は endpoint を識別子にして `PUT` と `DELETE /api/push/subscriptions/:endpoint` で出し入れする。公開鍵は `GET /api/push/vapid-public-key`
      - 通知の本文は今週 (月曜から当日まで、Asia/Tokyo) の Win と Slip の数で「9 wins and 2 slips this week. Open to look back with your coach.」。1 件は単数形、片方が 0 でも「1 win and 0 slips」のまま、両方 0 なら後半の 1 文だけ。TTL は 6 時間。push サービスが 404 か 410 を返した購読は消す。`Topic` ヘッダは `weeklyreview` で、英数字だけにする。RFC 8030 §5.4 も [Apple の文書](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers)も URL-safe Base64 の 32 文字以内 (`-` と `_` を含む) を許すが、web.push.apple.com は `weekly-review` と `weekly_review` に 400 `BadWebPushTopic` を返し、英数字だけの値は通した (2026-11-01、実機の購読で確認)。端末側の重複は payload の `tag` で畳む
      - `POST /api/push/test` が呼んだ人の購読にその場で同じ通知を送る。Profile の Notifications に「Send a reminder now」の行として置く。日曜を待たずに届くことを確かめるためで、通知の種類は増やさない
    - `web-push` パッケージは Node の crypto に依存して Worker で動かないので、WebCrypto で動く `@block65/webcrypto-web-push` を使う (aes128gcm と RFC 8292 の vapid。Apple が受け付ける組み合わせ)
    - iOS を想定する。アプリを PWA にし (manifest、アイコン、service worker)、ホーム画面に追加して使う。iOS ではホーム画面に追加したときだけ通知が届く。service worker は push だけを扱い、fetch には触らない。Access のログインリダイレクトを邪魔しないため
      - manifest は Access の Cookie つきでしか取れないので `crossorigin="use-credentials"` で参照する。通知を有効にする操作は Profile の Notifications グループの tint の行 (「Turn on the Sunday reminder」)。ホーム画面に追加する前の Safari では Push API が無いので、行の代わりに footer で追加を促す
      - ホーム画面のアイコンはデザインの placeholder (白地に名前、マークなし) を `scripts/icon.html` で描いた PNG。設計したアイコンができたら差し替える
    - 通知はこの用途だけ。他の通知は v1 では送らない

### Claude との相談

- 記録は専用ビュー、相談は別タブのチャット
  - Claude には読み取り専用ツールを持たせる (`read_entries`: 行動を期間、種別、カテゴリで。`read_weights`: 体重を期間で。範囲は 1 年まで、返す行は 400 まで)。ツールループは Worker 側で Anthropic SDK の `toolRunner` (stream) で回し、往復は 8 回まで。プロフィールは期間を持たないのでツールにせず、下のとおりシステムプロンプトに入れる
    - 書き込みツールは v1 では持たない。保存は記録ビューの確認フローに寄せる
  - 会話履歴はスレッド単位で D1 に保存する (`threads`、`messages`)。Claude にはスレッド全文を渡し、長くなったら先頭を落とす
    - API は `GET /api/threads` (一覧。最後の発言が新しい順。各行に Claude の最後の返答の 1 行目を `preview` として添える)、`POST /api/threads` (本文か `kind: weekly-review` で作る。作るだけで Claude は呼ばない)、`GET /api/threads/:id` (発言全部、古い順)、`POST /api/threads/:id/messages` (自分の発言を保存するだけ)、`POST /api/threads/:id/answer` (スレッドの今の状態に Claude が答える)。答えるのを保存と分けるのは、失敗後の Try again と Weekly review の最初の返答を同じ道で通すため。最後の発言が Claude のものなら 409
    - 落とすのは文字数で、新しい方から数えて 3 万字に収まる分だけ送る。残す先頭は自分の発言にそろえ、最後の発言は長くても必ず送る
    - 発言は 4000 字まで (メモの 2000 字と同じく、貼り付けた文書を止める上限)。スレッドの題は自分の最初の発言の 1 行目を 40 字で切ったもの。一覧の preview は Claude の最後の返答の 1 行目を 120 字で切ったもの。Weekly review は固定で「Weekly review」。Claude には付けさせない (呼び出しが 1 つ増えるため)。削除は v1 では作らない
    - `threads` に `kind` (chat / weekly-review) を持つ。Weekly review の入口と通知の `/coach/weekly-review` は、その日 (Asia/Tokyo) に作った Weekly review があればそれを開き、なければ新しく作る (日曜の通知を 2 度押しても 2 本にならない)。最初の発言は固定で「今週の行動と体重を読んで、できたこと、つまずき、来週の方針を 1 つにまとめて」
  - モデルはチャットが `claude-opus-5-5`、構造化が `claude-sonnet-5-5`。どちらも環境変数で差し替えられるようにする (`wrangler.jsonc` の vars `COACH_MODEL` と `STRUCTURE_MODEL`)。チャットの max_tokens は thinking 込みで 16000
  - 応答は SSE でストリーミングする。ツール実行中は「Reading your notes」をイベントで流す
    - イベントは `reading` (tool_use が始まるたび)、`text` (返答の断片)、`done` (保存した `assistant` の発言)、`error` (理由はログ用。画面の文言は 1 つ)。`text` を全部つなげたものがそのまま保存される。ツールの往復をはさんだ文はひとつ空行を挟む
    - 自分の発言は返答を求める前に保存する。返答に失敗したとき (API のエラー、refusal、max_tokens で切れた、何も言わなかった、オフライン) は最後の吹き出しの下に赤の 1 行「Could not reach your coach.」と Try again (answer をもう一度)。途中まで届いた返答は保存せず、画面からも消す
- プロフィールは毎回システムプロンプトに入れる。項目は身長、生年、性別、目標体重と期限、運動環境 (ジムか自宅か、器具、週回数)、制約メモ (自由文)。入っている項目だけを、今日の日付とともに指示文の後ろに置く (前半が日によって変わらないので prompt cache が効く)
  - API は `GET /api/profile` (全項目、未設定は null) と、Profile のグループごとの `PUT /api/profile/about` (身長、生年、性別)、`/goal`、`/training` (場所、週回数、器具)、`/notes` (制約メモ)。グループの全項目を送り、空にした項目は null で消す。どの PUT もプロフィール全体を返し、ページはそのうち保存したグループの項目だけを取り込む (2 つのグループを続けて保存したとき、後から着いた答えがもう一方を古い値に戻さないため)。グループ単位にするのは、読み込みが終わる前は Save を出さない体重の決定 (上の「記録するもの」) と同じく、見ていない項目を保存で消さないため
  - 範囲は身長 50 以上 250 未満 cm (小数 1 桁)、生年 1900 から今年 (Asia/Tokyo) まで、週回数 0 から 14 の整数。性別と場所は 50 字、器具は 200 字、制約メモはメモと同じ 2000 字。文字は前後の空白を落とし、空なら null。境界はページとサーバーで 1 つの定義 (`worker/profile-fields.ts`) を読む
  - 性別、場所、器具は自由文の行。デザインの Profile 画面は選択画面へ進む disclosure の行で描いているが、Claude は文字列をそのまま読むので選択肢を決める必要がなく、Profile に重ねる画面を増やさない (2026-11-02)
- システムプロンプトでボディメイクを軸に置く。頑張ったことと頑張れなかったことを踏まえて、運動と食事の両方について助言する

### UI

- 文言はすべて英語。利用者の入力と Claude の応答 (チャット、プレビューの一言、週の振り返り) は日本語
- OOUI。オブジェクトは行動、体重、相談スレッド、プロフィール。そのまま下タブ Notes、Weight、Coach、Profile にし、最後に開いたタブを記憶する
  - タブの上に重ねる画面 (All entries、後のスレッド) はパスを持つ (`/weight/all`、`/coach/weekly-review`)。History API の pushState で重ね、戻るは popstate。アドレスから直接開いたときは戻る先が無いので `/` に置き換え、その画面のタブを開く。重ねた画面で別のタブを押したときも `/` に置き換える (履歴に `/` が 1 つ余り、ブラウザの戻る 1 回が空振りする。iOS が root を差し替えるのと同じで、許容)。タブ自体にパスは無い
  - 各コレクションの先頭にインライン作成を置く。モーダルもウィザードも作らない
  - Notes は「振り返り」の節の通り
  - Weight は iOS のヘルスケアと同じ構成。先頭に今日の入力行、期間のセグメンテッドコントロール (W、M、6M、Y)、今日の値と 1 週間の増減、グラフ (目標線つき)、目標までの 1 文、直近の数行、最後に「Show all entries」で全件のリストへ。リストとグラフの切替はこれで代える
  - Coach はスレッド一覧から単一ビュー (チャット) へ。一覧の先頭に Weekly review の入口を置く
    - 一覧の先頭は multiline の Field「Ask your coach」。文字があるときだけ下に plain の「Send」ボタンを出し、押すと `POST /api/threads` でスレッドを作って `/coach/:id` を重ねる。その下に tint の行「Start weekly review」(detail は「Sundays, 20:00」)。押すと `kind: weekly-review` で今日のものを開くか作り、同じく重ねる。続いてスレッドの行: 題、副行に Claude の最後の返答の 1 行目、detail に最後の発言の日付 (Asia/Tokyo、「Oct 18」)。送れなければボタンの下に「Could not send. Try again.」、Weekly review を開けなければ行の下に「Could not start the weekly review. Try again.」
    - スレッドの画面は inline の NavBar (題と Coach への戻り)、吹き出し、下部に Composer (Messages 風のカプセルと送信ボタン)。タブバーは出さず、Composer がその場所に付く。通知の `/coach/weekly-review` は今日の Weekly review を開くか作り、アドレスをそのスレッドの `/coach/:id` に置き換える
    - 開いたとき最後の発言が自分のものなら (作った直後、通知から開いた Weekly review、前の返答が失敗したまま離れたスレッド) そのまま answer を呼ぶ。Try again も同じ answer。返答中は Composer を無効にする。送信は `POST /api/threads/:id/messages` で保存し、吹き出しを足してから answer。保存できなければ Composer の上に赤の 1 行「Could not send. Try again.」で本文は残す
    - 返答が流れる間は最新の発言が見えるように下までスクロールする。吹き出しごとの時刻や日付の行、題の下の日付は出さない (一覧の API はサーバーの today を返さず、端末の時計で Today を決めない方針のため)
  - Profile はデザインの画面の順に About you (Height cm、Born、Sex)、Goal (Goal weight、By)、Training (Where、Days a week、Equipment)、Notes for your coach (複数行の欄 1 つ)、Notifications。各グループに書き始めると右に Save が出て、保存できなければその下に「Could not save. Try again.」。プロフィールを読み込めなければグループの代わりに「Could not load your profile.」と Try again。Notes for your coach の footer は「Your coach reads everything above before every reply.」(Notifications は Claude が読まないので「above」)
- 見た目は iOS の標準 (Human Interface Guidelines) に揃える。部品は平らな一般的なもので、Liquid Glass は真似しない
  - 書体はシステムフォント。iOS では英数字が SF Pro、日本語が Hiragino Sans になる。テキストの Web フォントは読み込まない (読み込むのはアイコンフォントだけ)。サイズは iOS のテキストスタイル (本文 17、大見出し 34 など)。数字はタブラー
  - 色は iOS のシステムカラー (label、secondaryLabel、separator、systemBackground など) をライトもダークも Apple の値のまま使う。ダークモードは OS 設定に追従する
  - アクセント (tint) は iOS 標準の青 `#007AFF` (ダーク `#0A84FF`) の 1 色。ボタン、リンク、選択中のタブ、グラフの線に使う
  - 赤は systemRed。使うのはグラフの目標線 (破線) と破壊的操作 (Delete)、それに行の直下に出すエラーの 1 行 (caption-1) だけ。修正 (Edit) は tint の文字ボタン。Slip は secondaryLabel の文字と − の印で区別し、赤は使わない
  - 各画面の上に大きなタイトル (large title)。下にアイコン + ラベルのタブバー。アイコンは Framework7 Icons (SF Symbols は Apple プラットフォーム外で使えない)
  - リストは Notes、Weight、Coach が plain (全幅の行と区切り線)、Profile が inset grouped (設定アプリ風)。行の高さは 44
  - 記入欄はリストの行に置く。下線や枠線の入力欄は作らない。例外は Coach のスレッド下部の返信欄で、Messages と同じカプセル型にする
  - Coach のチャットは Messages 風の吹き出し。自分が tint、Claude がグレー
  - 主役は数字と推移である。数字以外は黙らせる。独自の装飾、グラデーション、ラベルの全大文字、データの等幅フォントは使わない。影はセグメンテッドコントロールの選択中の区画にだけ。グループ見出しも全大文字にしない (iOS の慣例からの唯一の逸脱)
  - 文言は文で書く。中黒やダッシュで項目をつなぐ定型 (「9 wins · 2 slips」) は使わない。日付の見出しは Today、Yesterday、その先は Friday, Oct 23。ボタンは起きることをそのまま言う (Save 3 entries、Edit text、Show all entries)
  - 見た目は github-toolkit の frontend-design スキルに沿って見直す。上記の決定はその結果

### 技術スタック

- フロントは Vite + React + TypeScript
- ホスティングは 1 Worker で SPA と API を配信する。`@cloudflare/vite-plugin`、`run_worker_first: ["/api/*"]`、`not_found_handling: "single-page-application"`
  - API は Hono。`hono/client` でフロントと型を共有する
  - Claude API は Anthropic TypeScript SDK を Worker から呼ぶ。API キーは Worker の secret (`wrangler secret put ANTHROPIC_API_KEY`)
- DB は D1 + Drizzle。`drizzle-kit generate` で SQL を出し、`wrangler d1 migrations apply` で当てる
  - テーブルは users、profiles、entries、workout_items、weights、threads、messages、push_subscriptions
- デプロイは GitHub Actions。main への push で migrate してから deploy する。PR では lint、typecheck、test だけ。actions は SHA ピン (github-toolkit の github-actions-workflows スキルに従う)
- ローカルは `vite dev` (Cloudflare プラグイン経由でローカル D1 つき)
  - 開発のツールチェーン (Node、pnpm、wrangler、テスト) は Docker コンテナで動かし、ホストに置くのは git、gh、docker だけ。入口は `make` (`compose.yaml` と `Makefile`)。`node_modules` はコンテナ側の名前付きボリュームに持つ。workerd や oxlint のネイティブバイナリがプラットフォーム別で、ホストのものと混ぜられないため
    - colima の virtiofs マウントは inotify を通さないので、Vite はポーリングで変更を拾う (`CHOKIDAR_USEPOLLING`)
- 日付は Asia/Tokyo 固定。Cron の時刻は UTC で書くので JST から引き直す。単位は kg、km、分
- パッケージマネージャは pnpm。テストは vitest (API のツール関数と構造化の JSON スキーマが主な対象)
  - lint は oxlint。型を使う規則は tsgolint が TypeScript 7 の上で動かす。TypeScript 7 は typescript-eslint が読み込む compiler API を持たないので ESLint は使わない。整形は Prettier
  - テストから D1 を使うときは wrangler の `getPlatformProxy` でローカル D1 を起こす。`@cloudflare/vitest-pool-workers` は vitest 4 までしか動かないため。vitest 5 で動くようになったら切り替える
  - Node は 26、pnpm は 12。依存は Dependabot で最新に追従する。公開から 7 日待ってから取り込む

## すでに用意されているもの

このリポジトリの外で済んでいる作業。それぞれの場所と、ここから使うときの名前。

### GitHub (yamat47/infra-github で管理)

- このリポジトリは `site` プロファイル。public、main は PR と署名コミットのみ、merge commit 運用
- Actions 環境 `deploy` があり、使えるブランチは main だけ。Cloudflare のデプロイ用トークンが環境 secret `CLOUDFLARE_API_TOKEN` として入っている。権限は公式テンプレート「Edit Cloudflare Workers」に D1 Edit を足したもので、アカウントは yamat47 のみ。最初のデプロイが通ったら、使っていない権限を外してこの行を実際の構成に合わせる
- デプロイのワークフローは `deploy` 環境を名乗り、トークンを `secrets.CLOUDFLARE_API_TOKEN`、アカウント ID を `vars.CLOUDFLARE_ACCOUNT_ID` (secret ではなく変数) から読む
- Actions 変数 `CLOUDFLARE_ACCOUNT_ID` = `24a305c930f17853bb811c18bee6074a`
- main の必須チェックは CI のジョブ名で lint、build、typecheck、zizmor、test。infra-github #35 (2026-10-31) が `terraform/owners/yamat47/locals.tf` の trainote エントリに `required_checks` として足した (default branch の管理は infra-github #33)

### Cloudflare (yamat47/infra-yamat47 の `terraform/accounts/yamat47/cloudflare` で管理)

- D1 データベース `trainote` (apac)。`prevent_destroy` つき
- Access アプリ `trainote` (self_hosted、`trainote.yamat47.workers.dev`、セッション 730h。理由は「利用者と認証」) と、上記メール 1 件を allow するポリシー
- Terraform の outputs は次の 3 つ。`wrangler.jsonc` と Worker のコードにそのまま書く。どれも secret ではない
  - `trainote_d1_database_id` = `7f0a88bc-9c70-414e-84f8-0964400dab4b` (D1 バインディングの `database_id`)
  - `trainote_access_aud` = `462b3c5e4250c32653c929bb5f47600eb544d6e11b0c1747ea66bbe0615ab294` (Access の JWT を検証するときの audience)
  - `trainote_access_team_domain` = `yamat47.cloudflareaccess.com` (同じく issuer と証明書の取得先)
- Zero Trust の Google ログイン方法は手で登録済み。IdP の id は `0a257bc8-2462-4567-b5c6-0943cb816183` (ダッシュボードの編集画面 URL の末尾)。Access アプリは `allowed_idps` にこの 1 件だけを持ち、ログイン画面を飛ばして Google に直行する
- Worker 名は `trainote`。workers.dev のサブドメインは `yamat47.workers.dev`。Zero Trust のチームドメインは `yamat47.cloudflareaccess.com`
- 手元のコンテナの wrangler が使う API トークン `trainote local wrangler`。ダッシュボードで手で作成。権限はデプロイ用と同じテンプレート「Edit Cloudflare Workers」に D1 Edit を足したもので、アカウントは yamat47 のみ。値はこの Mac のリポジトリ直下の `.env` にだけ `CLOUDFLARE_API_TOKEN` として置いてある (git 管理外)。別の機械で使うときは同じ要領でもう 1 つ作る。`make whoami` で確かめられる

### デザイン (claude.ai の Design System アーティファクト)

- デザインシステム `trainote` = https://claude.ai/artifact/DsCPBeo51tExs5wGcYXe8k (非公開。所有者だけが開ける)
  - iOS のシステムカラー、システムフォントのテキストスタイル、余白と角丸をトークンにしてある。ライトとダークの値は Apple のものをそのまま使う
  - 公開している部品は `design/src/index.ts` の 20 個 (Screen、NavBar、TabBar、ListHeader、List、Inset、Group、Row、Mark、Text、Field、Button、Actions、Segmented、Stat、Graph、Week、Bubble、Composer、Icon)
  - 2026-11-01 から正本はリポジトリの `design/` (トークンは `design/system/tokens.json`、部品は `design/src/`)。このアーティファクトはそこから公開する写しになる。運用は `docs/design.md`。文書の「見た目」の行と食い違ったら文書を直す
  - アイコンフォント Framework7 Icons 5.0.5 (MIT) を `fonts/` に同梱している (写しは `design/system/fonts/`)。これはキャンバスとプレビュー用で、アプリは npm の `framework7-icons@5.0.5` から同じファイルを配る
- 画面 `trainote screens` = https://claude.ai/artifact/2uZYx9fL9R1WBsEFD8jhHB (非公開。上のデザインシステムの部品をそのまま載せている)
  - iPhone 幅 (390 × 844) で 8 枚。Notes、Notes の構造化プレビュー、Weight、Weight の全件リスト、Coach のスレッド一覧、週の振り返りのスレッド、Profile、日曜の通知
  - 各画面の Tweaks でライトとダークを切り替えられる
- 部品は Storybook (`make storybook`) で見る。部品とトークンの変更はリポジトリで行い、`make project` が作る `design/project/` を `design-publish` スキルでアーティファクトへ届ける (`docs/design.md`)。`design/screens/` は 2026-10 に画面のアーティファクトから手で写したもの
  - 画面のアーティファクトにまだ無いもの: Profile の Notifications グループ (Sunday reminder の行、Send a reminder now の行、footer)、Notes の「Read as entries」ボタン。画面のアーティファクトが持つデザインシステムの写し (`ds/trainote/`) は古いままで、更新は頼んだときだけ (`docs/design.md`)

### 使うスキル (yamat47/github-toolkit)

`.claude/skills/` に `gh skill install yamat47/github-toolkit <name>` で入れてある: typescript-idioms、react-patterns、api-design、github-actions-workflows、writing-conventions、create-pr、review-pr、test-audit、review-dependency-bump、review-skill-update、design-publish。frontend-design は同じものが Claude Code のプラグインとして入っているので、リポジトリには入れない (両方あると二重に効く)。更新は update-skills ワークフローが毎週 PR を開き、review-skill-update で見る。`design-publish` はデザインシステムをアーティファクトに公開する (`docs/design.md`)。コミットメッセージと PR 本文は英語、Conventional Commits。AI の痕跡 (Co-Authored-By、session URL、Generated with) は残さない。

## 最初の一歩

1. (済) `npm create cloudflare@latest -- trainote --framework=react` 相当の構成を pnpm で起こし、Hono と Drizzle を足す
2. (済) `wrangler.jsonc` に D1 バインディング (`DB`)、`run_worker_first`、`not_found_handling`、`access.dev`、`triggers.crons` を書く
3. (済) Drizzle のスキーマと最初のマイグレーション
4. (済) CI (lint、typecheck、test、main で migrate と deploy)。main の必須チェックは infra-github #35
5. (済) PWA (manifest、アイコン、service worker) と Web Push の購読と送信

## 未決

決まったら該当する行に書き写し、ここから消す。

- 行動の保存後の編集と削除
- 種目で絞ったときの推移の指標 (最大重量、総量、有酸素は距離か時間か)
- 過去日付の記録を入れられるか
- 行動の保存は entries と workout_items の 2 文で、間で失敗したあとの Try again は同じ entries をもう一度入れる。編集と削除が入るまでは許容し、一覧で見えて困るなら 1 つのバッチにまとめる (id を select で引き直す)
- 初回に開くタブ
- 増量の目標 (目標体重が今より重いとき)。いまは減量として読む
- 返答中のスレッドをもう一度 answer すると返答が 2 つ並ぶ (返答中に離れてすぐ戻った、日曜の通知を 2 度押した)。Worker が返答中のスレッドに 409 を返すか、ページが待つか
