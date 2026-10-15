import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const required = [
  'package.json', '.env.example', 'middleware.ts',
  'src/app/login/page.tsx', 'src/app/dashboard/page.tsx',
  'src/app/equipment/page.tsx', 'src/app/breakdowns/page.tsx',
  'src/app/maintenance/page.tsx', 'src/app/reports/page.tsx',
  'src/app/settings/page.tsx', 'src/app/users/page.tsx',
  'supabase/first_admin_setup.sql',
  'supabase/migrations/202610140001_initial_schema.sql',
  'supabase/migrations/202610140002_auth_profiles.sql',
  'supabase/migrations/202610140009_equipment_movements_rpc.sql',
  'supabase/migrations/202610150001_two_level_access.sql',
  'supabase/migrations/202610150002_breakdown_workflow.sql',
  'supabase/migrations/202610150003_maintenance_management.sql',
  'supabase/migrations/202610150004_application_settings.sql',
  'FINAL_VALIDATION_ET_DEPLOIEMENT.md',
];
const missing = required.filter((file) => !existsSync(resolve(root, file)));
const envExample = readFileSync(resolve(root, '.env.example'), 'utf8');
const secretPatterns = [
  /SUPABASE_SERVICE_ROLE_KEY\s*=\s*[^\s#]{12,}/,
  /sb_secret_[A-Za-z0-9_-]{12,}/,
  /eyJ[A-Za-z0-9_-]{40,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
];
const suspiciousSecret = secretPatterns.some((pattern) => pattern.test(envExample));
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const scripts = packageJson.scripts ?? {};
const requiredScripts = ['typecheck', 'lint', 'build'];
const missingScripts = requiredScripts.filter((name) => !scripts[name]);

if (missing.length || suspiciousSecret || missingScripts.length) {
  console.error('VALIDATION STRUCTURELLE : ÉCHEC');
  if (missing.length) console.error('Fichiers manquants :\n- ' + missing.join('\n- '));
  if (suspiciousSecret) console.error('Une valeur ressemblant à un secret a été détectée dans .env.example.');
  if (missingScripts.length) console.error('Scripts npm manquants : ' + missingScripts.join(', '));
  process.exit(1);
}
console.log('VALIDATION STRUCTURELLE : OK');
console.log(`${required.length} chemins critiques présents.`);
console.log('Aucune clé privée évidente détectée dans .env.example.');
console.log('ATTENTION : ceci ne remplace ni la compilation, ni les tests RLS, ni les tests de bout en bout.');
