# Skweeb — Synthèse du concept de jeu et du système de transformation

## 1. Référence du projet

Skweeb constitue le point de départ technique et créatif du projet. L’objectif est de prolonger son univers et ses outils existants vers une expérience d’exploration, de création et de transformation d’objets graphiques.

L’idée n’est pas de repartir de zéro, mais de s’appuyer sur les mécanismes déjà présents — dessin à la manette, recettes d’événements, objets, carte, Vault et applications graphiques — pour construire un système d’itérations visuelles.

## 2. Intention générale

Le projet est un jeu d’exploration et de création dans lequel le joueur découvre, produit et transforme des formes graphiques.

L’inspiration vient notamment de plusieurs jeux :

- **RimWorld** : pour les systèmes de gènes et la possibilité de combiner des caractéristiques.
- **Noita** : pour les interactions entre éléments et la construction de systèmes à partir de composants ordonnés.
- **Les jeux d’exploration procédurale** : pour la découverte de nouvelles formes, de nouvelles créatures et de nouveaux contextes.

Le joueur explore des cartes et des variations de mondes. Il peut y découvrir des objets, des plantes ou des créatures, puis modifier leur contexte et produire de nouvelles versions.

La dimension centrale est l’expérimentation : comprendre comment une forme est construite, appliquer des transformations, observer le résultat et conserver les découvertes intéressantes.

## 3. La fleur comme objet graphique

Une fleur est d’abord un dessin réalisé dans Skweeb à l’aide de la manette.

Ce dessin n’est pas simplement une image figée. Il est constitué d’une **recette d’événements** qui décrit les gestes ayant produit la forme.

Chaque événement peut notamment contenir des informations comme :

- `t` : le temps de l’événement ;
- `x`, `y` : sa position ;
- `rotation` : son orientation ;
- `scale` : son échelle ;
- `familyId` : la famille graphique utilisée ;
- `spriteIndex` : l’image ou le sprite utilisé ;
- `pattern` : le motif ou le type de dessin.

La recette devient ainsi une matière manipulable. Une fleur peut être rejouée, modifiée, transformée ou servir de base à une nouvelle génération.

## 4. La recette et les transformations

Le système repose sur une idée simple :

**Une fleur est une recette d’événements, à laquelle on peut appliquer une série ordonnée de transformations.**

La recette d’origine reste préservée. Les transformations produisent une nouvelle recette ou une nouvelle instance de la fleur.

Une transformation — ou *modifier* — agit sur les événements selon des règles précises.

### Exemples de transformations simples

- Remplacer le `spriteIndex` par une autre image.
- Changer l’image tous les quatre motifs.
- Augmenter l’échelle de `+0.1` ou `+0.5`.
- Multiplier l’échelle par `2`.
- Augmenter progressivement la rotation.
- Modifier seulement certains événements ou certaines parties du dessin.

Ces opérations peuvent être combinées et appliquées dans un ordre donné.

Par exemple :

1. Remplacer certaines images.
2. Agrandir progressivement les éléments.
3. Augmenter leur rotation.
4. Appliquer un effet miroir.
5. Générer une nouvelle fleur à partir du résultat.

L’ordre des opérations est important : appliquer un miroir avant ou après une modification de rotation peut produire des résultats différents.

## 5. Le contexte génétique et les générations

Le terme « génome » peut être utilisé comme métaphore, mais il ne s’agit pas nécessairement d’un système biologique abstrait.

Le système peut être représenté par :

- une recette source ;
- une liste ordonnée de transformations ;
- une recette résultante ;
- une filiation permettant de retrouver les versions précédentes.

Une génération correspond simplement à une nouvelle version produite par transformation.

Une fleur peut donc être :

- créée à partir d’un dessin initial ;
- transformée par un ou plusieurs modifiers ;
- enregistrée comme nouvelle version ;
- utilisée à son tour comme source d’une autre transformation.

La recette d’origine n’est pas écrasée. Les différentes branches d’évolution restent accessibles.

Pour les transformations aléatoires, une graine (*seed*) peut être enregistrée afin de pouvoir reproduire un résultat.

## 6. Les applications comme modifiers

Les applications existantes de Skweeb peuvent progressivement devenir des composants du système de transformation.

### Filter

Filter peut être utilisé comme premier exemple d’intégration.

Un effet miroir, par exemple, peut être considéré comme un modifier placé dans le contexte de la fleur. Il transforme la forme produite, puis le résultat peut être enregistré ou placé ailleurs sur la carte.

Il faudra distinguer les transformations qui modifient directement la recette d’événements de celles qui agissent au niveau du rendu ou de la composition graphique.

### Particles

L’application Particles pourrait permettre d’ajouter ou de transformer des systèmes de particules associés à une fleur ou à un objet.

### RIG

RIG ouvre la possibilité de modifier la structure d’un squelette.

La recette graphique et la recette du squelette peuvent être manipulées séparément, puis combinées. Une fleur ou une créature pourrait ainsi changer à la fois d’apparence et de structure.

À terme, les applications ne sont plus seulement des outils isolés : elles deviennent des modules réutilisables dans les chaînes de transformation.

## 7. Carte, objets et exploration

Les fleurs transformées peuvent être placées dans le monde.

Le joueur peut :

- prendre une fleur existante ;
- lui appliquer un ou plusieurs modifiers ;
- faire pousser ou placer le résultat à un autre endroit de la carte ;
- observer les différences entre les versions ;
- poursuivre les transformations à partir d’une nouvelle génération.

La carte devient un espace d’expérimentation et de comparaison.

Les objets doivent conserver leur identité et leur filiation : une nouvelle fleur peut référencer sa source et les transformations qui l’ont produite, sans modifier l’objet initial.

## 8. Le Vault et l’herbier

Le Vault peut servir à conserver les fleurs découvertes ou créées.

L’herbier serait une vue ou une organisation du Vault, plutôt qu’un système de stockage parallèle.

Le joueur pourrait y enregistrer :

- la fleur ;
- sa recette ;
- ses transformations ;
- ses parents ou sa filiation ;
- les différentes versions obtenues.

L’herbier devient ainsi un catalogue de découvertes, mais aussi une mémoire des expérimentations du joueur.

## 9. Principes de conception

Quelques principes structurants se dégagent :

### Préserver les sources

Une recette originale ne doit pas être détruite par une transformation. Chaque résultat peut être conservé comme une nouvelle version.

### Garder les opérations compréhensibles

Les modifiers doivent être simples à manipuler et à combiner : changer une image, modifier une échelle, augmenter une rotation, appliquer un miroir, etc.

### Rendre les transformations visibles

Le joueur doit pouvoir observer le résultat d’une opération et comprendre ce qu’elle a changé.

### Composer les applications

Filter, Particles et RIG doivent pouvoir s’intégrer progressivement dans le même système, sans imposer une architecture spécifique à chaque application.

### Favoriser l’expérimentation

Le système doit permettre de tester des transformations, de revenir aux sources et de conserver les résultats intéressants.

## 10. Première étape de développement

La première version peut rester très simple et se concentrer sur les fleurs dessinées dans Skweeb.

Un premier prototype pourrait permettre de :

1. Charger ou sélectionner une recette de fleur.
2. Afficher ses événements et sa forme.
3. Appliquer quelques modifiers simples : changement de sprite, échelle et rotation.
4. Combiner plusieurs modifiers dans un ordre défini.
5. Visualiser le résultat.
6. Enregistrer la nouvelle version dans le Vault.
7. Conserver la filiation entre la fleur source et la fleur transformée.

Cette base permettrait ensuite d’intégrer le miroir de Filter, puis les systèmes Particles et RIG.

L’enjeu principal est de construire un système de transformation générique, tout en conservant le caractère concret et visuel des outils de Skweeb.
