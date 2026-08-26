import en from './messages/en.json';

type Messages = typeof en;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- rozszerzanie interfejsu next-intl wymaga dziedziczenia
  interface IntlMessages extends Messages {}
}
