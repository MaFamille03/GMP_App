import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const required = [
  'package.json', '.env.example', 'middleware.ts', 'README.md',
  'FINAL_VALIDATION_ET_DEPLOIEMENT.md',
  'src/app/login/page.tsx', 'src/app/dashboard/page.tsx',
  'src/app/equipment/page.tsx', 'src/app/breakdowns/page.tsx',
  'src/app/maintenance/page.tsx', 'src/app/reports/page.tsx',
  'src/app/settings/page.tsx', 'src/app/users/page.tsx',
  'src/app/stock/page.tsx', 'src/app/movements/page.tsx',
  'src/app/access-disabled/page.tsx',
  'supabase/first_admin_setup.sql',
  'docs/CONCEPTION_FONCTIONNELLE_GMP.md',
  'docs/ETAPE_3_INVENTAIRE.md', 'docs/ETAPE_4_GESTION_PANNES.md',
  'docs/ETAPE_5_SUIVI_MAINTENANCE.md', 'docs/ETAPE_6_STOCK_BIOMEDICAL.md',
  'docs/ETAPE_7_RAPPORTS_ET_TRACABILITE.md', 'docs/ETAPE_9_SECURITE_ET_ACCES.md',
];
const migrationDir = resolve(root, 'supabase/migrations');
const migrations = readdirSync(migrationDir).filter((f) => f.endsWith('.sql')).sort();
const expectedMigrations = [
  '202610140001_initial_schema.sql',
  '202610140002_auth_profiles.sql',
  '202610140009_equipment_movements_rpc.sql',
  '202610150001_two_level_access.sql',
  '202610150002_breakdown_workflow.sql',
  '202610150003_maintenance_management.sql',
  '202610150004_application_settings.sql',
  '202610150005_schema_alignment_and_audit.sql',
  '202610150006_breakdown_history_and_closure.sql',
  '202610150007_spare_parts_stock.sql',
  '202610150008_security_hardening.sql',
];
const missing = required.filter((f) => !existsSync(resolve(root, f)));
const missingMigrations = expectedMigrations.filter((f) => !migrations.includes(f));
const duplicateVersions = migrations.map((f) => f.match(/^([0-9]+)_/)?.[1]).filter(Boolean).filter((v, i, a) => a.indexOf(v) !== i);
const envExample = readFileSync(resolve(root, '.env.example'), 'utf8');
const suspiciousSecret = [
  /SUPABASE_SERVICE_ROLE_KEY\s*=\s*(?!#|$)[^\s]{12,}/m,
  /sb_secret_[A-Za-z0-9_-]{12,}/,
  /eyJ[A-Za-z0-9_-]{40,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
].some((p) => p.test(envExample));
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const missingScripts = ['typecheck', 'lint', 'build', 'validate:release'].filter((s) => !pkg.scripts?.[s]);
const errors = missing.length || missingMigrations.length || duplicateVersions.length || suspiciousSecret || missingScripts.length;
if (errors) {
  console.error('VALIDATION STRUCTURELLE DE LIVRAISON : ÉCHEC');
  if (missing.length) console.error('Fichiers manquants :\n- ' + missing.join('\n- '));
  if (missingMigrations.length) console.error('Migrations manquantes :\n- ' + missingMigrations.join('\n- '));
  if (duplicateVersions.length) console.error('Versions de migration dupliquées : ' + [...new Set(duplicateVersions)].join(', '));
  if (suspiciousSecret) console.error('Une valeur ressemblant à un secret a été détectée dans .env.example.');
  if (missingScripts.length) console.error('Scripts npm manquants : ' + missingScripts.join(', '));
  process.exit(1);
}
console.log('VALIDATION STRUCTURELLE DE LIVRAISON : OK');
console.log(`${required.length} chemins critiques présents.`);
console.log(`${expectedMigrations.length} migrations attendues présentes et ordonnées par nom.`);
console.log('Aucune clé privée évidente détectée dans .env.example.');
console.log('Limite : ce contrôle ne valide pas le SQL sur PostgreSQL, les politiques RLS, ni la compilation ou les parcours utilisateur.');
