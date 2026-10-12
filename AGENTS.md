# Komori development

Read docs/PRODUCT.md before changing behavior. Preserve published/draft isolation and RLS. Never commit secrets, local .env files, downloaded credentials or test accounts. Test-first for behavior changes: write the regression, observe failure, implement, rerun affected tests and build. Use npm and the committed lockfile. npm run check is the minimum gate; npm run test:e2e checks browser flows. Record incomplete live verification honestly. User-facing text belongs in the PT-BR/English dictionary. License: GPL-3.0-only; artwork ownership stays with creators.
