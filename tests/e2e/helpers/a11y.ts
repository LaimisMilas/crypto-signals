import { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export async function scanA11y(page: Page) {
  await new AxeBuilder({ page }).analyze();
}
