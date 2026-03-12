import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {StyleSheet} from 'react-native';
import {AppProvider} from './context/AppContext';
import HomeScreen from './screens/HomeScreen';
import ScannerScreen from './screens/ScannerScreen';
import SettingsScreen from './screens/SettingsScreen';

export type RootStackParamList = {
  Home: undefined;
  Scanner: undefined;
  Settings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const App = () => (
  <GestureHandlerRootView style={styles.flex}>
    <SafeAreaProvider>
      <AppProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{
              headerShown: false,
              cardStyle: {backgroundColor: '#F0F2F5'},
            }}>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Scanner" component={ScannerScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </AppProvider>
    </SafeAreaProvider>
  </GestureHandlerRootView>
);

const styles = StyleSheet.create({flex: {flex: 1}});
export default App;
