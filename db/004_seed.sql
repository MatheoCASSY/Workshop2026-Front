-- ============================================================
-- Jeu de données de démonstration (reprend l'univers de la maquette)
-- ============================================================

insert into public.zone (nom, description) values
  ('Pont 2 — chambre froide', 'Stockage alimentaire réfrigéré'),
  ('Pont 2 — serre',          'Culture hydroponique'),
  ('Pont 1 — passerelle',     'Poste de commandement'),
  ('Salle des machines',      'Propulsion et énergie'),
  ('Infirmerie',              'Soins et quarantaine');

insert into public.equipement (nom, type, criticite, id_zone) values
  ('Groupe froid A',       'refrigeration', 'haute',    1),
  ('Pompe hydroponique 2', 'fluides',       'normale',  2),
  ('Console de navigation','informatique',  'critique', 3),
  ('Réacteur bâbord',      'propulsion',    'critique', 4),
  ('Autoclave',            'medical',       'haute',    5);

insert into public.competence (nom, categorie, description) values
  ('Habilitation électrique',  'electrique',    'Interventions sous tension'),
  ('Soudure structure',        'structure',     'Réparation de coque et cloisons'),
  ('Maintenance fluides',      'mecanique',     'Circuits hydrauliques et pompes'),
  ('Réseaux et serveurs',      'informatique',  'Infrastructure de bord'),
  ('Premiers secours',         'medical',       'Gestes d''urgence');
