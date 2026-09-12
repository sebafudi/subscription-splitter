# Migrations

Sequential wrangler SQL migrations, named `0001_<slug>.sql` upward. Applied locally with
`npm run db:migrate:local` and remotely with `npm run db:migrate:remote`, and applied in the
integration test setup so the suite runs against the same schema. The first migration lands with the
runtime-auth slice (S-01).
