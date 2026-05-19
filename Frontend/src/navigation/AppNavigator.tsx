import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/main/HomeScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { AdminDashboardScreen } from '../screens/main/AdminDashboardScreen';
import { MapSearchScreen } from '../screens/main/MapSearchScreen';
import { OwnerParkingMapScreen } from '../screens/main/OwnerParkingMapScreen';
import { theme } from '../theme/theme';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="MapSearch" component={MapSearchScreen} />
      <Stack.Screen name="OwnerParkingMap" component={OwnerParkingMapScreen} />
    </Stack.Navigator>
  );
};
