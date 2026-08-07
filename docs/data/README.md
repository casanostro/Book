# data/ — actualités du site

Les entrées de la page [/actualites/](../actualites/) vivent dans
`actualites.json`. **Publier une actualité = ajouter une entrée dans ce
fichier et committer.** Aucun backend, aucun CMS : le dépôt Git est la
base de données, l'historique Git est l'historique de publication.

## Schéma d'une entrée

```json
{
  "date": "2026-08-07",
  "titre": "Titre court de l'entrée",
  "tags": ["mcp", "llm"],
  "contenu": "Texte de l'entrée. **gras**, *italique*, [lien](https://…) et paragraphes (ligne vide) sont supportés.",
  "lien": null
}
```

| Champ     | Type              | Obligatoire | Notes |
|-----------|-------------------|-------------|-------|
| `date`    | `"YYYY-MM-DD"`    | oui         | sert au tri (décroissant) et à l'affichage |
| `titre`   | string            | oui         | titre de la carte |
| `tags`    | array de strings  | non         | alimentent les filtres en haut de page |
| `contenu` | string (markdown léger) | non   | gras / italique / liens / paragraphes uniquement |
| `lien`    | string ou `null`  | non         | URL du bouton « consulter → ». Utiliser un chemin **relatif à `/actualites/`** pour les pages internes (ex. `../projets/poc-mcp/`), jamais un chemin absolu commençant par `/` (le site est servi sous `/PodcastPlatform/`) |

## Workflow de publication

1. Ouvrir `docs/data/actualites.json`
2. Ajouter la nouvelle entrée (l'ordre dans le fichier importe peu, la
   page trie par date décroissante — par confort, ajoutez en tête)
3. Vérifier que le JSON reste valide (une virgule oubliée et la page
   affichera son état d'erreur au lieu du fil)
4. Commit + push sur `main` → GitHub Pages redéploie automatiquement

## Cas limites gérés par la page

- fichier vide ou tableau `[]` → message « aucune actualité »
- JSON invalide ou fetch en échec → message d'erreur explicite
- entrée sans `date` ou sans `titre` → ignorée silencieusement
