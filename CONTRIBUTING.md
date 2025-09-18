# Contributing to Bubulle

Merci de votre intérêt pour contribuer à Bubulle ! 🫧

## Comment contribuer

### Signaler un bug

Si vous trouvez un bug, veuillez créer une issue avec les informations suivantes :

- **Description** : Description claire du problème
- **Étapes pour reproduire** : Comment reproduire le bug
- **Comportement attendu** : Ce qui devrait se passer
- **Comportement actuel** : Ce qui se passe réellement
- **Environnement** : Version de VS Code, OS, version de l'extension

### Proposer une fonctionnalité

Pour proposer une nouvelle fonctionnalité :

1. Vérifiez d'abord qu'elle n'existe pas déjà dans les issues
2. Créez une issue avec le label "enhancement"
3. Décrivez clairement la fonctionnalité et son utilité

### Contribuer au code

1. **Fork** le repository
2. **Clone** votre fork localement
3. **Créez** une branche pour votre fonctionnalité : `git checkout -b feature/ma-fonctionnalite`
4. **Installez** les dépendances : `npm install`
5. **Développez** votre fonctionnalité
6. **Testez** vos modifications
7. **Commitez** vos changements : `git commit -m "Add: description de la fonctionnalité"`
8. **Pushez** vers votre fork : `git push origin feature/ma-fonctionnalite`
9. **Créez** une Pull Request

## Standards de code

### TypeScript
- Utilisez TypeScript strict
- Ajoutez des types explicites
- Suivez les conventions de nommage camelCase
- Documentez les fonctions complexes

### Messages d'erreur
- Tous les messages d'erreur doivent être en anglais
- Utilisez des messages clairs et informatifs
- Évitez les messages techniques pour l'utilisateur final

### Tests
- Ajoutez des tests pour les nouvelles fonctionnalités
- Assurez-vous que tous les tests passent
- Maintenez une couverture de test raisonnable

## Structure du projet

```
src/
├── extension.ts          # Point d'entrée principal
└── test/
    └── extension.test.ts # Tests unitaires

out/                      # Code compilé (généré automatiquement)
resources/                # Ressources statiques (icônes, etc.)
```

## Développement local

1. Clonez le repository
2. Installez les dépendances : `npm install`
3. Ouvrez le projet dans VS Code
4. Appuyez sur `F5` pour lancer l'extension en mode debug
5. Une nouvelle fenêtre VS Code s'ouvrira avec votre extension chargée

## Build et packaging

```bash
# Compiler le TypeScript
npm run compile

# Lancer les tests
npm test

# Linter le code
npm run lint

# Créer le package .vsix
npm install -g vsce
vsce package
```

## Guidelines pour les Pull Requests

- **Titre clair** : Décrivez brièvement ce que fait la PR
- **Description détaillée** : Expliquez les changements et pourquoi
- **Tests** : Assurez-vous que vos changements sont testés
- **Documentation** : Mettez à jour la documentation si nécessaire
- **Une fonctionnalité par PR** : Gardez les PRs focalisées

## Questions ?

N'hésitez pas à poser des questions dans les issues ou à contacter les mainteneurs.

Merci de contribuer à Bubulle ! 🫧
