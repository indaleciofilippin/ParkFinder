import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/main/HomeScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { AdminDashboardScreen } from '../screens/main/AdminDashboardScreen';
import { MapSearchScreen } from '../screens/main/MapSearchScreen';
import { OwnerParkingMapScreen } from '../screens/main/OwnerParkingMapScreen';
import { FindParkingScreen } from '../screens/main/FindParkingScreen';
import { CreateBookingScreen } from '../screens/main/CreateBookingScreen';
import { ManageParkingScreen } from '../screens/main/ManageParkingScreen';
import { MyParkingsScreen } from '../screens/main/MyParkingsScreen';
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
      <Stack.Screen name="FindParking" component={FindParkingScreen} />
      <Stack.Screen name="CreateBooking" component={CreateBookingScreen} />
      <Stack.Screen name="ManageParking" component={ManageParkingScreen} />
      <Stack.Screen name="MyParkings" component={MyParkingsScreen} />
    </Stack.Navigator>
  );
};
