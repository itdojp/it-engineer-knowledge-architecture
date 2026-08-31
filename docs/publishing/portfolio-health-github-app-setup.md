---
layout: default
title: Portfolio Health GitHub App設定Runbook
description: 公開書籍を横断監視する読み取り専用GitHub Appの作成、限定インストール、secret登録、検証、失効手順
---

# Portfolio Health GitHub App設定Runbook

## 目的と適用範囲

Portfolio Healthは、公開中の書籍リポジトリについてActions、deployment、Pages、Issue、Pull Request件数等の運用状態を横断収集する。このRunbookは、横断読み取りに使うGitHub Appを最小権限で作成し、対象リポジトリだけへインストールし、`itdojp/it-engineer-knowledge-architecture`のActionsから利用できる状態にする手順を定義する。

- 実装Issue: [#278](https://github.com/itdojp/it-engineer-knowledge-architecture/issues/278)
- 実装PR: [#279](https://github.com/itdojp/it-engineer-knowledge-architecture/pull/279)
- 対象アカウント: `itdojp`
- 設定先リポジトリ: `itdojp/it-engineer-knowledge-architecture`

このAppは横断情報の**読み取り専用**である。Alert Issueの作成・更新・クローズには、ポータルリポジトリへ限定されたActionsの`github.token`を別に使用する。個人用PAT、`gh` CLIのOAuth token、長期固定したinstallation tokenを**Workflow credentialとして保存・使用しない**。管理者が本Runbookの`gh`確認コマンドを実行する場合は、管理操作として現在のCLI認証を使用する。

## 認証構成

```text
GitHub App
  ├─ published public書籍へselected installation
  ├─ App ID
  │    └─ repository variable
  │       PORTFOLIO_HEALTH_APP_ID
  └─ Private key
       └─ repository Actions secret
          PORTFOLIO_HEALTH_APP_PRIVATE_KEY

Portfolio Health workflow
  ├─ 実行時だけ短期installation tokenを発行
  ├─ selected repositoryの運用状態をread-onlyで収集
  └─ Alertのwrite操作にはportal固有のgithub.tokenを使用
```

GitHub Appのprivate keyはinstallation tokenを発行するための永続的な認証情報である。Issue、PR、コメント、ログ、artifact、チャット、Git管理対象へ出力してはならない。

## 必要な権限

### 実行者

- `itdojp` OrganizationのOwner、またはGitHub Appを管理できるApp Manager
- `itdojp/it-engineer-knowledge-architecture`へActions variable / secretを登録できる権限

リポジトリのAdmin権限だけでは、Organization所有のGitHub Appを作成・インストールできない場合がある。GitHub App設定が表示されない場合はOrganization Ownerが実施する。

### GitHub AppのRepository permissions

次の5項目だけを`Read-only`にする。

| Repository permission | 設定 |
| --- | --- |
| Actions | Read-only |
| Contents | Read-only |
| Deployments | Read-only |
| Issues | Read-only |
| Pages | Read-only |

`Metadata: Read-only`がGitHubにより自動付与される場合は許容する。Administration、Checks、Environments、Secrets、Workflows等、表にないRepository permissionは`No access`とする。

現行collectorは`GET /repos/{owner}/{repo}/issues`の`pull_request`フィールドからPull Request件数を集計する。このendpointに必要なのは`Issues: read`であり、Pull requests permissionは使用しない。PR #279の現行workflowに残る`permission-pull-requests: read`は、merge前に削除してtoken smokeで回帰がないことを確認する。

Organization permissionとAccount permissionはすべて`No access`とする。特にOrganization administration、Organization members、Organization secrets、Organization hooksを付与しない。

## 1. GitHub Appを作成する

1. GitHubのプロフィールメニューから **Your organizations** を開く。
2. `itdojp`の **Settings** を開く。
3. **Developer settings > GitHub Apps > New GitHub App** を開く。
4. 次の基本設定を入力する。

| 項目 | 設定 |
| --- | --- |
| GitHub App name | 例: `itdojp-portfolio-health-readonly` |
| Description | `Read-only portfolio health collector for published books` |
| Homepage URL | `https://itdojp.github.io/it-engineer-knowledge-architecture/` |
| Callback URL | 空欄 |
| Request user authorization during installation | 無効 |
| Enable Device Flow | 無効 |
| Setup URL | 空欄 |
| Webhook Active | 無効 |
| Where can this GitHub App be installed? | Only on this account |

5. Repository permissionsを前節のread-only 5項目に限定する。
6. Organization / Account permissionsがすべて`No access`であることを確認する。
7. Webhookを無効にし、イベントを購読しない。
8. **Create GitHub App** を実行する。

## 2. App IDを記録する

作成後のApp設定画面に表示される数値の**App ID**を記録する。

```text
App ID: 1234567
```

`PORTFOLIO_HEALTH_APP_ID`へ登録するのはApp IDであり、`Iv1...`等で始まるClient IDではない。App IDは秘密情報ではないが、IssueやPRへ記載する必要はない。

PR #279の現行契約は次の入力を参照する。

```yaml
app-id: ${{ vars.PORTFOLIO_HEALTH_APP_ID }}
```

## 3. Private keyを生成する

1. GitHub App設定画面の **Private keys** を開く。
2. **Generate a private key** を実行する。
3. ダウンロードされたPEMファイルを安全な場所で管理する。

PEMは`BEGIN`行、改行、`END`行を含む全体をActions secretへ登録する。

```text
-----BEGIN RSA PRIVATE KEY-----
...
-----END RSA PRIVATE KEY-----
```

次を禁止する。

- PEMをIssue、PR、コメント、チャットへ貼り付ける
- PEMをリポジトリへ追加する
- PEMをworkflow artifactやログへ出力する
- private keyをshellのコマンドライン引数として渡す
- private keyから作ったinstallation tokenを固定secretとして保存する

secret登録後、平文のダウンロードファイルは暗号化された保管先へ移すか、不要なら削除する。

ローカルに保持している間はownerだけが読める権限にし、GitHub App設定画面のfingerprintと一致することを確認する。

```bash
PEM_FILE='/安全な場所/github-app.private-key.pem'
chmod 600 "$PEM_FILE"
openssl rsa -in "$PEM_FILE" -pubout -outform DER 2>/dev/null |
  openssl sha256 -binary |
  openssl base64
```

このコマンドが出力するのは公開鍵のfingerprintであり、PEM本文ではない。比較後もfingerprintをIssueやPRへ記載する必要はない。

## 4. Appを対象リポジトリへ限定インストールする

1. GitHub App設定画面で **Install App** を開く。
2. `itdojp`の **Install** を選択する。
3. **Only select repositories** を選択する。
4. catalogの`status=published`かつ`repoVisibility=public`のリポジトリだけを選択する。
5. **Install** を実行する。

`All repositories`を選択してはならない。対象はcatalogから毎回決定し、手作業で固定リストを管理しない。

```bash
set -euo pipefail

REPO=itdojp/it-engineer-knowledge-architecture
mkdir -p .codex-local/tmp
WORK_DIR=$(mktemp -d -p .codex-local/tmp portfolio-health-app-setup.XXXXXX)
CATALOG="$WORK_DIR/catalog.json"
EXPECTED="$WORK_DIR/expected-repositories.txt"
trap 'rm -r -- "$WORK_DIR"' EXIT

gh api \
  "repos/$REPO/contents/docs/_data/catalog.json?ref=main" \
  --jq .content |
base64 --decode > "$CATALOG"

jq -e '
  (.books | type == "array" and length > 0)
  and all(
    .books[];
    (.repo | type == "string")
    and (.repo | test("^itdojp/[A-Za-z0-9._-]+$"))
    and (.status | type == "string")
    and (.repoVisibility | type == "string")
  )
' "$CATALOG" >/dev/null

jq -r '
  .books[]
  | select(.status == "published" and .repoVisibility == "public")
  | .repo
' "$CATALOG" |
sort > "$EXPECTED"

test -s "$EXPECTED"
test -z "$(uniq -d "$EXPECTED")"
test "$(wc -l < "$EXPECTED" | tr -d ' ')" \
  -eq "$(sort -u "$EXPECTED" | wc -l | tr -d ' ')"
! grep -Fxq 'itdojp/it-engineer-knowledge-architecture' "$EXPECTED"

cat "$EXPECTED"
printf 'published public count=%s\n' "$(wc -l < "$EXPECTED" | tr -d ' ')"
```

2026-08-31時点の期待値は`40`である。件数が変わった場合はcatalog変更を確認し、古い期待値を理由に対象を増減させない。

次のprivate repositoryは対象外である。

```text
itdojp/ai-agent-collaboration-book
itdojp/BioinformaticsGuide-book
```

ポータル自身も横断read tokenのinstallation対象にしない。

```text
itdojp/it-engineer-knowledge-architecture
```

private書籍はcatalogですでに公開されている識別情報と集計値だけをreportへ含め、default branch SHA、workflow URL、Issue / PR詳細、API error詳細等の動的情報をredactする。

### Catalog変更時のinstallation同期

catalogで公開状態またはvisibilityを変更する場合は、App installationも同じ変更単位で監査する。

- public書籍を`published`へ変更する場合は、横断収集の有効化前にselected installationへ追加する。
- public書籍を公開対象から外す場合はselected installationから削除する。
- リポジトリをprivateへ変更する場合は、先に動的情報のredactionを確認し、selected installationから削除する。
- catalog集合とinstallation集合が一致しない状態をpartial successとして受け入れない。

GitHub App設定の **Install App > Configure** でselected repository一覧を開き、catalogから抽出した一覧と照合する。IssueやPRへは件数と差分だけを記録し、private repository情報を出力しない。

## 5. Repository variableを登録する

設定先は`itdojp/it-engineer-knowledge-architecture`の **Settings > Secrets and variables > Actions > Variables** である。

| 項目 | 値 |
| --- | --- |
| Name | `PORTFOLIO_HEALTH_APP_ID` |
| Value | GitHub App設定画面の数値App ID |

CLIを使う場合は次のように設定する。

```bash
REPO=itdojp/it-engineer-knowledge-architecture
APP_ID='数値のApp ID'

gh variable set PORTFOLIO_HEALTH_APP_ID \
  --repo "$REPO" \
  --body "$APP_ID"

unset APP_ID
```

## 6. Repository secretを登録する

設定先は`itdojp/it-engineer-knowledge-architecture`の **Settings > Secrets and variables > Actions > Secrets** である。

| 項目 | 値 |
| --- | --- |
| Name | `PORTFOLIO_HEALTH_APP_PRIVATE_KEY` |
| Secret | PEMファイル全体 |

CLIではprivate keyをコマンドライン引数へ入れず、標準入力から登録する。

```bash
REPO=itdojp/it-engineer-knowledge-architecture
PEM_FILE='/安全な場所/github-app.private-key.pem'

gh secret set PORTFOLIO_HEALTH_APP_PRIVATE_KEY \
  --repo "$REPO" \
  < "$PEM_FILE"
```

## 7. 値を表示せず設定名を確認する

variableとsecretは名前だけを確認する。

```bash
REPO=itdojp/it-engineer-knowledge-architecture

gh variable list \
  --repo "$REPO" \
  --json name \
  --jq '
    [.[].name | select(. == "PORTFOLIO_HEALTH_APP_ID")]
    | if length == 1 then "PRESENT" else "MISSING" end
  '

gh secret list \
  --repo "$REPO" \
  --json name \
  --jq '
    [.[].name | select(. == "PORTFOLIO_HEALTH_APP_PRIVATE_KEY")]
    | if length == 1 then "PRESENT" else "MISSING" end
  '
```

期待結果は次のとおりである。

```text
PRESENT
PRESENT
```

secretは登録後にGitHubから値を読み戻せない。確認のためにPEMをログへ表示してはならない。

## 8. PR #279再開前の検証

variableとsecretの存在だけではPR #279をmergeしない。次をすべて確認する。

1. Appのrepository permissionがread-only 5項目だけである。
2. Organization / Administration permissionがない。
3. selected installationが最新catalogのpublished public集合と一致する。
4. private repositoryとportal repositoryがinstallation対象外である。
5. workflowがApp installation tokenを実行時だけ発行し、`skip-token-revoke: false`のpost処理で失効を試みる。post処理のrevocation warningは成功扱いにしない。
6. token smokeでActions、Contents、Deployments、Issues、Pagesのreadが成功する。
7. write操作が横断read tokenへ混入していない。
8. report件数がpublished件数と一致し、private dynamic leakが0である。
9. installation repository集合の過不足、public repositoryのpartial observation、権限不足を非ゼロ終了させる。

### 必須のinstallation集合smoke

PR #279には、発行したinstallation tokenで`GET /installation/repositories`を取得し、catalogのpublished public集合と完全一致させるfail-closed stepを追加する。tokenはコマンドライン引数にせず`GH_TOKEN`だけで渡す。

```yaml
- name: Verify portfolio installation scope
  env:
    GH_TOKEN: ${{ steps.portfolio-token.outputs.token }}
  shell: bash
  run: |
    set -euo pipefail
    expected="$RUNNER_TEMP/portfolio-health-expected-repositories.txt"
    actual="$RUNNER_TEMP/portfolio-health-actual-repositories.txt"

    jq -r '
      .books[]
      | select(.status == "published" and .repoVisibility == "public")
      | .repo
    ' docs/_data/catalog.json | sort > "$expected"

    gh api --paginate \
      -H 'X-GitHub-Api-Version: 2026-03-10' \
      /installation/repositories \
      --jq '.repositories[].full_name' | sort > "$actual"

    test -s "$expected"
    test -z "$(uniq -d "$expected")"
    test -z "$(uniq -d "$actual")"
    diff --unified=0 "$expected" "$actual"
```

このstepは不足だけでなく、catalog外repositoryがinstallationへ追加された場合も失敗する。repository名の一覧は公開情報だが、tokenやprivate keyは出力しない。

### 必須の収集結果smoke

collector実行後、public repositoryのpartial observationを許容せず、reportの母数をcatalogと照合する。

```bash
set -euo pipefail

expected_count=$(jq '[.books[] | select(.status == "published")] | length' \
  docs/_data/catalog.json)

jq -e --argjson expected "$expected_count" '
  .source.recordCount == $expected
  and (.books | length) == $expected
  and .summary.partialObservations == 0
' tmp/portfolio-health/report.json >/dev/null
```

通常reportとしてpartial observationを記録する機能は維持してよいが、App設定の受け入れ試験と初回merge gateではpartial `0`を必須とする。Workflowがgreenであることだけを権限・coverageの証明にしてはならない。

PR #279の現行headは`actions/create-github-app-token` v2系の監査済みSHAを使用するが、この版のruntimeはNode.js 20である。GitHub Actions runnerからNode.js 20が削除される2026-09-23より前に、Node.js 24対応版のcommit SHA、入力互換性、権限縮小、token失効を再監査し、PRを更新してからmergeする。mutableなmajor tagには変更しない。

## Fail-closed停止条件

次のいずれかに該当した場合はworkflowやPRをmergeせず、設定を修正する。

- required variableまたはsecretがない
- App IDではなくClient IDが登録されている
- Appにwrite、Administration、Organization permission、未使用のPull requests permissionがある
- `All repositories`でインストールされている
- catalogのpublished public集合とselected installationが一致しない
- private repositoryが選択されている
- private keyまたはinstallation tokenがログ、Issue、PR、artifactへ出力された
- token smokeがpartial failureを正常として扱う
- installation tokenのpost処理にrevocation warningがある
- Node.js 20 runtimeのまま長期scheduled運用へ入る

## Rotation、漏えい、廃止

### 通常のkey rotation

1. GitHub App設定で新しいprivate keyを生成する。
2. `PORTFOLIO_HEALTH_APP_PRIVATE_KEY`を新しいPEMで更新する。
3. token smokeとPortfolio Healthのmanual workflowを成功させる。
4. GitHub App設定から旧private keyを削除する。
5. 旧PEMの平文コピーを廃棄する。

先に旧keyを削除するとworkflowが停止するため、新keyの検証後に削除する。

### 漏えい時

1. Organizationのinstalled App設定からinstallationを**Suspend**する。即時遮断が必要でSuspendできない場合はUninstallする。
2. 影響したprivate keyをGitHub App設定から削除する。
3. 漏えいしたinstallation token自体を保持している場合は、そのtokenを`GH_TOKEN`として`gh api --method DELETE /installation/token`で失効させる。token値はコマンドラインやログへ出さない。
4. 新しいkeyを生成し、fingerprintを照合してrepository secretを更新する。
5. Actions run、audit log、Issue / PR / artifactへの漏えい有無を確認する。
6. selected installationとApp permissionsに不正変更がないか確認する。
7. AppをSuspendした主体が、監査完了後にUnsuspendする。Uninstallした場合は本Runbookのselected installation手順から再構成する。
8. installation集合、token read、partial `0`、redaction、revocation postを再検証する。

private keyを削除しても、すでに発行されたinstallation tokenの即時失効をそれだけで証明できない。installation tokenは通常1時間有効であるため、漏えい時はSuspendまたはUninstallを最初に行う。

### Appを廃止する場合

1. GitHub App installationをアンインストールする。
2. Appのprivate keyを削除する。
3. repository variableとsecretを削除する。
4. workflowを無効化または代替認証へ移行するPRを先に用意する。

## 完了チェックリスト

- [ ] Appは`itdojp`所有かつOnly on this accountである
- [ ] Webhook、OAuth、Device Flowは無効である
- [ ] read-only 5権限以外はNo accessである
- [ ] Organization / Administration permissionはない
- [ ] selected installationはcatalogのpublished public集合と一致する
- [ ] private repositoryとportal repositoryは対象外である
- [ ] `PORTFOLIO_HEALTH_APP_ID`が存在する
- [ ] `PORTFOLIO_HEALTH_APP_PRIVATE_KEY`が存在する
- [ ] private keyとtokenは外部へ出力されていない
- [ ] Node.js 24対応Actionの監査済みSHAへ更新済みである
- [ ] token smoke、全件収集、redaction、partial failure試験が成功する
- [ ] installation集合がcatalog集合と完全一致する
- [ ] token revocation postにwarningがない
- [ ] exact-head CI、review completeness、main、Pages、公開HTTPを確認した

## 公式資料

- [Registering a GitHub App](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app)
- [Installing your own GitHub App](https://docs.github.com/en/apps/using-github-apps/installing-your-own-github-app)
- [Managing private keys for GitHub Apps](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/managing-private-keys-for-github-apps)
- [Making authenticated API requests with a GitHub App in a GitHub Actions workflow](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/making-authenticated-api-requests-with-a-github-app-in-a-github-actions-workflow)
- [GitHub Actions secrets](https://docs.github.com/en/actions/concepts/security/secrets)
- [Create GitHub App Token Action](https://github.com/actions/create-github-app-token)
- [Deprecation of Node 20 on GitHub Actions runners](https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/)
- [REST API endpoints for GitHub App installations](https://docs.github.com/en/rest/apps/installations)
- [Suspending a GitHub App installation](https://docs.github.com/en/apps/maintaining-github-apps/suspending-a-github-app-installation)
- [REST API endpoints for Issues](https://docs.github.com/en/rest/issues/issues#list-repository-issues)
