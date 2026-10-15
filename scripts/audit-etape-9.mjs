import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const warnings = [];
const required = [
  'package.json', '.env.example', 'middleware.ts', 'src/lib/supabase/access.ts',
  'src/app/api/admin/users/route.ts', 'src/app/settings/actions.ts',
  'src/app/equipment/page.tsx', 'src/app/breakdowns/page.tsx',
  'src/app/maintenance/page.tsx', 'src/app/reports/page.tsx',
  'supabase/migrations/202610140001_initial_schema.sql',
  'supabase/migrations/202610140002_auth_profiles.sql',
  'supabase/migrations/202610140009_equipment_movements_rpc.sql',
  'supabase/migrations/202610150001_two_level_access.sql',
  'supabase/migrations/202610150002_breakdown_workflow.sql',
  'supabase/migrations/202610150003_maintenance_management.sql',
  'supabase/migrations/202610150004_application_settings.sql',
  'supabase/migrations/202610150008_security_hardening.sql',
  'docs/ETAPE_9_SECURITE_ET_ACCES.md',
];
for (const file of required) if (!fs.existsSync(path.join(root, file))) failures.push(`Fichier requis absent : ${file}`);

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
for (const script of ['typecheck', 'lint', 'build']) if (!pkg.scripts?.[script]) failures.push(`Script npm absent : ${script}`);

const settingsActions = fs.readFileSync(path.join(root, 'src/app/settings/actions.ts'), 'utf8');
if (settingsActions.includes('typeof tableByKind') || settingsActions.includes('tableByKind')) failures.push('Référence potentiellement indéfinie tableByKind dans les actions des paramètres.');
if (!settingsActions.includes('requireAdmin()')) failures.push('Les actions des paramètres ne semblent pas toutes protégées par requireAdmin().');

const access = fs.readFileSync(path.join(root, 'src/lib/supabase/access.ts'), 'utf8');
if (!access.includes('profile.is_active') || !access.includes('profile.role === "admin"')) failures.push('Vérifier le contrôle du statut actif et du rôle administrateur.');
const invite = fs.readFileSync(path.join(root, 'src/app/api/admin/users/route.ts'), 'utf8');
if (!invite.includes('SUPABASE_SERVICE_ROLE_KEY') || !invite.includes('profile.role !== "admin"')) failures.push('Vérifier la protection de l’API d’invitation et la clé serveur.');
const stockPage = fs.readFileSync(path.join(root, 'src/app/stock/page.tsx'), 'utf8');
if (stockPage.includes('profile.role === "biomedical_manager"')) failures.push('Un rôle historique non-admin dispose encore de contrôles d’écriture dans le stock.');
const securityMigration = fs.readFileSync(path.join(root, 'supabase/migrations/202610150008_security_hardening.sql'), 'utf8');
if (!securityMigration.includes('audit_profile_security_changes') || !securityMigration.includes('public.can_manage_biomedical()')) failures.push('Vérifier la migration de durcissement et la traçabilité des profils.');

if (fs.existsSync(path.join(root, '.env.local'))) failures.push('.env.local présent dans le dossier livrable : ne pas distribuer.');
if (!fs.existsSync(path.join(root, 'package-lock.json'))) warnings.push('package-lock.json absent : installation non verrouillée et non reproductible tant que le registre npm est inaccessible.');
if (fs.existsSync(path.join(root, '.git'))) warnings.push('Un dossier .git est présent dans le dossier de travail ; il doit être exclu de l’archive distribuée.');

if (failures.length) {
  console.error('AUDIT ETAPE 9 : ECHEC');
  failures.forEach((x) => console.error(`- ${x}`));
  process.exitCode = 1;
} else {
  console.log(`AUDIT ETAPE 9 : contrôles statiques réussis (${required.length} chemins requis).`);
}
for (const warning of warnings) console.warn(`AVERTISSEMENT : ${warning}`);
