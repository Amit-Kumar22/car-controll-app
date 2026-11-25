export type RootStackParamList = {
  Home: undefined;
  CarConnect: undefined;
  CarControl: undefined;
  HomeConnect: undefined;
  HomeControl: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
