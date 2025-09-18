#!/bin/bash

# Script de configuration pour GitHub
echo "🚀 Configuration du repository GitHub pour Bubulle..."

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo "❌ Erreur: Ce script doit être exécuté depuis la racine du projet"
    exit 1
fi

# Initialiser Git si ce n'est pas déjà fait
if [ ! -d ".git" ]; then
    echo "📦 Initialisation du repository Git..."
    git init
    git add .
    git commit -m "Initial commit: Bubulle extension setup"
fi

# Ajouter le remote GitHub (remplacer par votre URL)
echo "🔗 Ajout du remote GitHub..."
echo "⚠️  N'oubliez pas de remplacer 'joey' par votre nom d'utilisateur GitHub"
echo "git remote add origin https://github.com/joey/bubulle.git"

# Installer les dépendances
echo "📥 Installation des dépendances..."
npm install

# Compiler le projet
echo "🔨 Compilation du projet..."
npm run compile

# Lancer les tests
echo "🧪 Lancement des tests..."
npm test

# Formater le code
echo "✨ Formatage du code..."
npm run format

# Vérifier le linting
echo "🔍 Vérification du linting..."
npm run lint

echo "✅ Configuration terminée!"
echo ""
echo "📋 Prochaines étapes:"
echo "1. Créez un nouveau repository sur GitHub"
echo "2. Remplacez 'joey' par votre nom d'utilisateur dans package.json"
echo "3. Ajoutez le remote: git remote add origin https://github.com/VOTRE-USERNAME/bubulle.git"
echo "4. Pushez le code: git push -u origin main"
echo "5. Configurez les secrets GitHub pour les releases automatiques"
echo ""
echo "🎉 Votre extension Bubulle est prête pour GitHub!"
