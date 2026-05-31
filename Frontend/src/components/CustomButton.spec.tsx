import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CustomButton } from './CustomButton';

// Mock expo-linear-gradient to avoid rendering issues under Node environment
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, style }: any) => <View style={style}>{children}</View>,
  };
});

describe('CustomButton Component - Unit Tests (AAA Pattern)', () => {

  test('should render primary button with custom title', () => {
    // 1. Arrange
    const title = 'Click Me';
    const onPressMock = jest.fn();

    // 2. Act
    const { getByText } = render(
      <CustomButton title={title} onPress={onPressMock} variant="primary" />
    );

    // 3. Assert
    const buttonText = getByText(title);
    expect(buttonText).toBeTruthy();
  });

  test('should call onPress when button is tapped', () => {
    // 1. Arrange
    const title = 'Tap Me';
    const onPressMock = jest.fn();
    const { getByText } = render(
      <CustomButton title={title} onPress={onPressMock} />
    );
    const buttonElement = getByText(title);

    // 2. Act
    fireEvent.press(buttonElement);

    // 3. Assert
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  test('should display ActivityIndicator and disable press when isLoading is true', () => {
    // 1. Arrange
    const title = 'Loading Button';
    const onPressMock = jest.fn();
    
    // 2. Act
    const { queryByText, UNSAFE_getByType } = render(
      <CustomButton title={title} onPress={onPressMock} isLoading={true} />
    );

    // 3. Assert
    // Text should not be found when loading
    const buttonText = queryByText(title);
    expect(buttonText).toBeNull();
    
    // The button component should receive the disabled prop
    const touchable = UNSAFE_getByType(require('react-native').TouchableOpacity);
    expect(touchable.props.disabled).toBe(true);
  });

  test('should render outlined and text variants correctly', () => {
    // 1. Arrange
    const outlinedTitle = 'Outlined Action';
    const textTitle = 'Text Action';
    const onPress = jest.fn();

    // 2. Act
    const outlinedRender = render(
      <CustomButton title={outlinedTitle} onPress={onPress} variant="outlined" />
    );
    const textRender = render(
      <CustomButton title={textTitle} onPress={onPress} variant="text" />
    );

    // 3. Assert
    expect(outlinedRender.getByText(outlinedTitle)).toBeTruthy();
    expect(textRender.getByText(textTitle)).toBeTruthy();
  });

});
