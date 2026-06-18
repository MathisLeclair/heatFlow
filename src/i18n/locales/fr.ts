const fr = {
  mode: { edit: 'Éditer', simulate: 'Simuler' },
  header: {
    sample: 'Exemple',
    blank: 'Vide',
    lightMode: 'Passer en mode clair',
    darkMode: 'Passer en mode sombre',
    tutorial: 'Tutoriel',
    aboutModel: 'À propos du modèle',
  },
  panel: {
    properties: 'Propriétés',
    outsideEnv: 'Environnement extérieur',
    openings: 'Ouvertures',
    layouts: 'Dispositions',
    scenarios: 'Scénarios',
    tempOverTime: 'Température au fil du temps',
  },
  tool: {
    select: 'Sélectionner',
    drawRoom: 'Dessiner une pièce',
    addWindow: 'Ajouter une fenêtre',
    addDoor: 'Ajouter une porte',
    windowType: 'Type de fenêtre',
    doorType: 'Type de porte',
    hintSelect:
      "Cliquez sur une pièce, un mur ou une ouverture pour la modifier. Faites glisser les poignées d'angle d'une pièce sélectionnée pour la remodeler.",
    hintDrawRoom:
      "Cliquez pour ajouter des sommets ; cliquez sur le premier point pour fermer la pièce. Les points s'alignent sur une grille de 0,25 m et sur les angles existants.",
    hintAddWindow: 'Cliquez sur un mur pour placer une fenêtre.',
    hintAddDoor:
      'Cliquez sur un mur (les murs intérieurs relient les pièces) pour placer une porte.',
  },
  outside: {
    noZone: 'Aucune zone extérieure.',
    dailySwing: 'Variation jour/nuit',
    nightLow: 'Nuit basse (°C)',
    dayHigh: 'Jour haut (°C)',
    peakHour: 'Heure de pic (0–23)',
    temperature: 'Température (°C)',
    sunOrientation: 'Soleil / orientation',
    startHour: 'Heure de début',
    startHourHelper: 'Heure du jour où la simulation commence',
    compassHint: 'Faites glisser la boussole sur le canevas pour définir le nord.',
  },
  openings: {
    empty: 'Aucune ouverture — dessinez des pièces, puis ajoutez des fenêtres ou des portes.',
    openAll: 'Tout ouvrir',
    closeAll: 'Tout fermer',
    window: 'Fenêtre',
    door: 'Porte',
  },
  properties: {
    nothingSelected:
      'Rien de sélectionné. Choisissez une pièce, un mur, une ouverture ou une zone extérieure pour modifier ses propriétés.',
  },
  room: {
    title: 'Pièce',
    name: 'Nom',
    airTemp: "Température de l'air actuelle (°C)",
    ceilingHeight: 'Hauteur sous plafond (m)',
    thermalMass: 'Masse thermique (vitesse de changement de température) :',
    delete: 'Supprimer la pièce',
  },
  wall: {
    exterior: 'Mur extérieur',
    interior: 'Mur intérieur',
    length: 'Longueur (m)',
    lengthHelper: "Déplace l'extrémité distale ; les murs adjacents s'ajustent.",
    construction: 'Construction',
    thickness: 'Épaisseur (m)',
    facesZone: 'Donne sur la zone extérieure',
  },
  opening: {
    titleWindow: 'Fenêtre',
    titleDoor: 'Porte',
    isOpen: 'Ouverte',
    isClosed: 'Fermée',
    glazing: 'Vitrage / isolation',
    size: 'Taille',
    width: 'Largeur (m)',
    height: 'Hauteur (m)',
    sillHeight: "Hauteur de l'appui (m)",
    positionAlongWall: 'Position le long du mur',
    delete: "Supprimer l'ouverture",
  },
  zone: {
    titleGlobal: 'Zone extérieure (globale)',
    titleCustom: 'Zone extérieure',
    name: 'Nom',
    diurnalSwing: 'Variation thermique jour/nuit',
    nightLow: 'Nuit basse (°C)',
    dayHigh: 'Jour haut (°C)',
    peakHeatHour: 'Heure de chaleur maximale (0–24)',
    temperature: 'Température (°C)',
    shelter: 'Enclos / abri :',
    shelterOpen: 'Air libre',
    shelterFull: 'Entièrement encloisonné',
    shelterPartial: '{{pct}}% abrité',
    shelterHelper:
      "Réduit le vent ambiant atteignant les ouvertures face à cette zone (ex. cour fermée).",
    delete: 'Supprimer la zone',
  },
  simulate: {
    running: 'Simulation…',
    run: 'Lancer la simulation',
    rerun: 'Relancer la simulation',
    coolingScore: 'SCORE DE FRAÎCHEUR',
    degreeHours: '°C·h au-dessus du confort',
    coolingScoreHelper:
      "Plus c'est bas, mieux c'est — degrés-heures moyens au-dessus de {{temp}}°C.",
    suggestions: 'Suggestions',
  },
  scenarios: {
    placeholder: 'ex. Ventilation nocturne',
    save: 'Sauvegarder',
    hint: "Enregistrez la configuration ouverte/fermée actuelle pour comparer les stratégies. Appliquez-en une, puis relancez la simulation pour voir son score.",
    openCount: '{{open}}/{{total}} ouvertes — appuyer pour appliquer',
  },
  layouts: {
    placeholder: 'Nom de la disposition…',
    save: 'Sauvegarder',
    hint: "Enregistrez le plan actuel pour rappeler différentes configurations de pièces indépendamment des scénarios d'ouvertures.",
    roomCount_one: '{{count}} pièce',
    roomCount_other: '{{count}} pièces',
    roomCountDate: '{{rooms}} · {{date}}',
    exportTooltip: 'Exporter le projet complet en fichier JSON',
    export: 'Exporter',
    importTooltip: 'Importer un projet depuis un fichier JSON',
    import: 'Importer',
  },
  project: {
    title: 'Projet',
    name: 'Nom',
    comfortTemp: 'Température de confort (°C)',
    comfortTempHelper: 'Utilisée pour le score de fraîcheur.',
    simLength: 'Durée de simulation (heures)',
    solarSection: 'Soleil / Orientation',
    startHour: 'Heure de début de simulation (0–23)',
    startHourHelper: "Heure du jour où la simulation commence (6 = 6h).",
    northOffset: 'Décalage nord (°)',
    northOffsetHelper:
      "Degrés dans le sens horaire depuis le haut du canevas jusqu'au nord. 0 = le haut est le nord.",
    export: 'Exporter JSON',
    import: 'Importer JSON',
    importError: 'Impossible de lire ce fichier comme projet HeatFlow.',
    reset: "Réinitialiser l'exemple",
    resetConfirm: "Remplacer le plan actuel par l'appartement d'exemple ?",
  },
  zoneList: {
    title: 'Zones extérieures',
    addZone: 'Ajouter une zone extérieure',
    diurnal: '{{min}}–{{max}}°C (pic {{peak}}h)',
    constant: '{{temp}}°C constant',
    hint: "Assignez chaque mur extérieur à une zone dans les propriétés du mur (ex. cour ombragée plus fraîche que la rue). Exemple de pic actuel : {{temp}}°C.",
  },
  disclaimer: {
    title: 'Comment fonctionne HeatFlow',
    intro: 'HeatFlow modélise chaque pièce comme une masse thermique concentrée. La chaleur se déplace entre les pièces et l\'extérieur de trois manières :',
    conduction: 'Conduction',
    conductionDesc:
      'à travers les murs et les fenêtres/portes fermées, selon leur valeur R/U et leur surface.',
    ventilation: 'Ventilation',
    ventilationDesc:
      "à travers les fenêtres/portes ouvertes, entraînée par la différence de température (effet de tirage) plus une légère brise de fond.",
    mixing: 'Mélange',
    mixingDesc: 'entre les pièces via les portes intérieures ouvertes.',
    timeNote:
      'La simulation fait avancer les températures dans le temps, vous permettant de voir des effets lents comme le refroidissement nocturne et la masse thermique.',
    disclaimer:
      "Ce sont des estimations techniques pour construire l'intuition, pas un calcul certifié d'énergie du bâtiment ou de CFD. La direction du vent, l'ombrage détaillé et l'humidité ne sont pas modélisés.",
    gotIt: 'Compris',
  },
  onboarding: {
    tip: 'Conseil :',
    next: 'Suivant',
    getStarted: 'Commencer',
    back: 'Retour',
    skip: 'Passer le tutoriel',
    step0: {
      title: 'Bienvenue dans HeatFlow',
      description:
        "HeatFlow simule comment la chaleur se déplace dans votre bâtiment au fil du temps. Dessinez un plan, configurez les murs et les ouvertures, puis lancez la simulation pour voir comment les températures intérieures évoluent — et trouvez la meilleure stratégie de ventilation.",
      tip: 'Cela prend environ 2 minutes.',
    },
    step1: {
      title: 'Dessinez votre plan',
      description:
        "Sélectionnez l'outil Dessiner une pièce (icône pentagone) dans la barre d'outils de gauche. Cliquez sur le canevas pour placer des sommets, puis double-cliquez — ou cliquez sur le premier point — pour fermer la pièce.",
      tip: "Les pièces partagent automatiquement les murs là où elles se touchent. Les murs intérieurs sont calculés pour vous.",
    },
    step2: {
      title: 'Ajouter des fenêtres et des portes',
      description:
        "Sélectionnez l'outil Fenêtre ou Porte, puis cliquez sur un mur extérieur pour placer une ouverture. Les ouvertures favorisent la ventilation naturelle : la simulation modélise l'effet de tirage (flottabilité) et une brise de fond.",
      tip: 'La ventilation croisée (ouvertures des deux côtés) bénéficie d\'un facteur 1,6×.',
    },
    step3: {
      title: 'Modifier les propriétés thermiques',
      description:
        "Cliquez sur une pièce, un mur ou une ouverture pour le sélectionner — ses propriétés apparaissent dans le panneau de droite. Définissez le type de construction, le vitrage, la hauteur sous plafond et la masse thermique.",
      tip: 'La masse thermique (3–15×) ralentit la vitesse à laquelle une pièce chauffe ou refroidit.',
    },
    step4: {
      title: "Configurer l'environnement extérieur",
      description:
        'Le panneau "Environnement extérieur" vous permet de définir la température extérieure avec une variation jour/nuit optionnelle. Ajoutez des zones personnalisées (ex. cour fermée) et utilisez le curseur d\'abri pour réduire le vent.',
      tip: "Une cour entièrement enclose bénéficie toujours de l'effet de tirage — seule la composante brise est réduite.",
    },
    step5: {
      title: 'Soleil et orientation solaire',
      description:
        "Faites glisser l'aiguille de la boussole dans le coin inférieur gauche du canevas pour la pointer vers le nord. La simulation calcule ensuite quels murs et fenêtres font face au soleil à chaque heure, et applique le gain solaire.",
      tip: "Réglez l'heure de début à 6 (6h) pour une simulation sur une journée entière. Le vitrage Faible-E a un coefficient de gain solaire bien inférieur au simple vitrage.",
    },
    step6: {
      title: 'Lancer la simulation',
      description:
        'Passez en mode Simulation et appuyez sur Lancer. Les pièces sont colorées selon leur température. Faites glisser la timeline pour naviguer dans le temps, ou appuyez sur lecture pour animer. Le score de fraîcheur indique les degrés-heures au-dessus du confort.',
      tip: 'Sauvegardez différentes configurations de fenêtres comme Scénarios pour les comparer côte à côte.',
    },
  },
  language: { en: 'English', fr: 'Français' },
} as const

export default fr
