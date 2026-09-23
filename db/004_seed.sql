-- ============================================================
-- Jeu de données de démonstration — référentiels
-- ============================================================
-- Ici, uniquement ce qui ne dépend de personne : lieux, équipements,
-- compétences. L'équipage, les habilitations et les incidents sont créés par
-- scripts/seed-users.mjs, qui tourne après : ils ont besoin de comptes
-- d'authentification, et ça, du SQL ne sait pas le faire.
--
-- Ordre d'insertion = ordre des identifiants. Les scripts s'appuient dessus,
-- ne réordonne pas les lignes sans relire seed-users.mjs.

-- ------------------------------------------------------------
-- ZONES (les lieux de la station)
-- ------------------------------------------------------------
insert into public.zone (nom, description) values
  ('Pont 1 — passerelle',        'Poste de commandement et navigation'),
  ('Pont 1 — quartiers',         'Cabines et espaces de vie de l''équipage'),
  ('Pont 2 — chambre froide',    'Stockage alimentaire réfrigéré'),
  ('Pont 2 — serre',             'Culture hydroponique et production d''oxygène'),
  ('Pont 3 — infirmerie',        'Soins, quarantaine et pharmacie'),
  ('Salle des machines',         'Propulsion, production et distribution d''énergie'),
  ('Sas d''amarrage',            'Accostage des navettes et transfert de fret'),
  ('Local technique',            'Tableaux électriques et baies réseau');

-- ------------------------------------------------------------
-- EQUIPEMENTS
-- ------------------------------------------------------------
-- La criticité n'est pas la gravité d'un incident : elle dit ce qu'on perd si
-- l'équipement tombe, indépendamment de la panne en cours.
insert into public.equipement (nom, type, criticite, id_zone) values
  ('Console de navigation',   'informatique',  'critique', 1),
  ('Radar de proximité',      'informatique',  'haute',    1),
  ('Recycleur d''air A',      'ventilation',   'critique', 2),
  ('Groupe froid A',          'refrigeration', 'haute',    3),
  ('Groupe froid B',          'refrigeration', 'normale',  3),
  ('Pompe hydroponique 1',    'fluides',       'haute',    4),
  ('Pompe hydroponique 2',    'fluides',       'normale',  4),
  ('Éclairage horticole',     'electrique',    'basse',    4),
  ('Autoclave',               'medical',       'haute',    5),
  ('Concentrateur d''oxygène','medical',       'critique', 5),
  ('Réacteur bâbord',         'propulsion',    'critique', 6),
  ('Réacteur tribord',        'propulsion',    'critique', 6),
  ('Circuit de refroidissement', 'fluides',    'haute',    6),
  ('Vérin de sas 2',          'mecanique',     'critique', 7),
  ('Joint d''étanchéité sas 2','structure',    'critique', 7),
  ('Onduleur principal',      'electrique',    'critique', 8),
  ('Baie réseau B',           'informatique',  'haute',    8),
  ('Tableau divisionnaire 3', 'electrique',    'normale',  8);

-- ------------------------------------------------------------
-- COMPETENCES
-- ------------------------------------------------------------
-- Au moins deux par catégorie : le formulaire de déclaration ne propose que
-- les compétences de la catégorie choisie, une catégorie vide rendrait les
-- incidents de ce type indéclarables.
insert into public.competence (nom, categorie, description) values
  ('Habilitation électrique BR', 'electrique',   'Intervention et consignation sous tension'),
  ('Consignation haute tension', 'electrique',   'Mise hors tension et verrouillage des départs'),
  ('Diagnostic onduleur',        'electrique',   'Batteries, redresseurs et bascules secteur'),

  ('Maintenance fluides',        'mecanique',    'Circuits hydrauliques, pompes et vannes'),
  ('Machines tournantes',        'mecanique',    'Paliers, alignement et équilibrage'),
  ('Soudure TIG',                'mecanique',    'Assemblage de tuyauteries inox et alu'),

  ('Réseaux et serveurs',        'informatique', 'Commutation, routage et infrastructure de bord'),
  ('Supervision SCADA',          'informatique', 'Automates, capteurs et remontée d''alarmes'),
  ('Sauvegarde et restauration', 'informatique', 'Plans de reprise et jeux de sauvegarde'),

  ('Premiers secours PSC1',      'medical',      'Gestes d''urgence et alerte'),
  ('Oxygénothérapie',            'medical',      'Administration et surveillance de l''oxygène'),

  ('Soudure structure',          'structure',    'Réparation de coque et de cloisons'),
  ('Contrôle d''étanchéité',     'structure',    'Mise sous pression et détection de fuite'),
  ('Travail en hauteur',         'structure',    'Harnais, lignes de vie et échafaudages');
