/**
 * Özellik bayrakları.
 *
 * Kurum ("dershane") portalı henüz demo aşamasında (Faz 3). Üretim derlemesinde
 * varsayılan olarak gizlidir; açmak için `VITE_ENABLE_INSTITUTION=1` ile derle.
 * Geliştirmede her zaman görünür.
 */
export const INSTITUTION_ENABLED: boolean =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_INSTITUTION === '1';
