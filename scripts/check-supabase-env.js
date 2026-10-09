const requiredVariables = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
];

const missingVariables = requiredVariables.filter(
  (name) => !process.env[name]?.trim()
);

if (missingVariables.length > 0) {
  console.error(
    `Missing required build environment variable(s): ${missingVariables.join(', ')}.\n` +
      'Add them to the EAS environment used by this build, then build again. ' +
      'Use only a Supabase publishable key; never use a service_role key.'
  );
  process.exitCode = 1;
}
