export const db = {
  query: jest.fn()
};
export function getDbPool(){ return db; }
export function isDbReady(){ return true; }
export default { db };
