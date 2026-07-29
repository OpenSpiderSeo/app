/** Типы интеграций (GSC, Metrika, …). */

export const IntegrationId = {
  GoogleSearchConsole: 'gsc',
  YandexMetrika: 'metrika',
  YandexWebmaster: 'webmaster',
  GoogleAnalytics4: 'ga4',
  PageSpeedInsights: 'psi',
} as const;

export type IntegrationIdName = (typeof IntegrationId)[keyof typeof IntegrationId];

export const IntegrationStatus = {
  Available: 'available',
  Connected: 'connected',
  ComingSoon: 'coming_soon',
} as const;

export type IntegrationStatusName =
  (typeof IntegrationStatus)[keyof typeof IntegrationStatus];

export interface IntegrationDescriptor {
  id: IntegrationIdName;
  name: string;
  description: string;
  status: IntegrationStatusName;
  docsUrl: string;
}
