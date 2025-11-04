import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, RouteProp } from '@react-navigation/native';

// Auth Stack
export type AuthStackParamList = {
  Auth: undefined;
};

// Main App Stack
export type AppTabParamList = {
  Home: undefined;
  Shops: undefined;
  Scan: undefined;
  Wallet: undefined;
  Profile: undefined;
};

// Navigation Props
export type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabParamList, 'Home'>,
  StackNavigationProp<AppTabParamList>
>;

export type ShopsScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabParamList, 'Shops'>,
  StackNavigationProp<AppTabParamList>
>;

export type ScanScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabParamList, 'Scan'>,
  StackNavigationProp<AppTabParamList>
>;

export type WalletScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabParamList, 'Wallet'>,
  StackNavigationProp<AppTabParamList>
>;

export type ProfileScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabParamList, 'Profile'>,
  StackNavigationProp<AppTabParamList>
>;

// Screen Props
export type HomeScreenProps = {
  navigation: HomeScreenNavigationProp;
};

export type ShopsScreenProps = {
  navigation: ShopsScreenNavigationProp;
};

export type ScanScreenProps = {
  navigation: ScanScreenNavigationProp;
};

export type WalletScreenProps = {
  navigation: WalletScreenNavigationProp;
};

export type ProfileScreenProps = {
  navigation: ProfileScreenNavigationProp;
};

// Auth Screen Props
export type AuthScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Auth'>;
export type AuthScreenProps = {
  navigation: AuthScreenNavigationProp;
};
