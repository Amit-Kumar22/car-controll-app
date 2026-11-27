export type RootStackParamList = {
  Home: undefined;
  CarConnect: undefined;
  CarControl: undefined;
  HomeConnect: undefined;
  HomeControl: undefined;
  Cloud: undefined;
  CloudDevice: { id: string };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
