# グリーンパラダイスを GitHub Pages で公開する手順

1. GitHub で新しいリポジトリを作ります。
2. この `New project` フォルダの中身を、そのリポジトリに入れます。
3. リポジトリの default branch を `main` にします。
4. GitHub の `Settings > Pages` を開きます。
5. `Build and deployment` の `Source` を `GitHub Actions` にします。
6. `main` に push すると、自動で `green-paradise-web` フォルダが公開されます。

公開される中身:

- `green-paradise-web/index.html`
- `green-paradise-web/styles.css`
- `green-paradise-web/game.js`

メモ:

- 最初の公開には数分かかることがあります。
- スマホでもブラウザからそのまま遊べます。
- URL はだいたい `https://<ユーザー名>.github.io/<リポジトリ名>/` になります。
