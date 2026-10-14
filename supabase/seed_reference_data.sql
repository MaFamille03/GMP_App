-- Référentiels de départ optionnels : à exécuter après la migration.
-- Les équipements et leurs états ne sont volontairement pas préremplis sans inventaire confirmé.

insert into public.services (name, code, description)
values
  ('Imagerie', 'IMG', 'Service d’imagerie médicale'),
  ('Dialyse', 'DIA', 'Service de dialyse'),
  ('Réanimation', 'REA', 'Service de réanimation'),
  ('Bloc opératoire', 'BLOC', 'Bloc opératoire'),
  ('Stérilisation', 'STER', 'Service de stérilisation'),
  ('Fibroscopie', 'FIB', 'Service de fibroscopie'),
  ('Laboratoire / bactériologie', 'LAB', 'Laboratoire et bactériologie'),
  ('Ophtalmologie', 'OPH', 'Service d’ophtalmologie')
on conflict (name) do nothing;

insert into public.equipment_categories (name, description)
values
  ('Imagerie médicale', 'Équipements d’imagerie à préciser par type'),
  ('Dialyse', 'Générateurs et équipements de dialyse'),
  ('Réanimation et ventilation', 'Respirateurs et équipements de réanimation'),
  ('Surveillance', 'Moniteurs et dispositifs de surveillance'),
  ('Bloc opératoire et anesthésie', 'Tables, colonnes et équipements d’anesthésie'),
  ('Aspiration et oxygénothérapie', 'Aspirateurs, extracteurs et concentrateurs'),
  ('Stérilisation', 'Autoclaves et équipements de stérilisation'),
  ('Laboratoire', 'Analyseurs et équipements de laboratoire'),
  ('Fibroscopie', 'Équipements de fibroscopie'),
  ('Ophtalmologie', 'Équipements ophtalmologiques'),
  ('Autre', 'Catégorie à préciser')
on conflict (name) do nothing;
