import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../utils/constants';
import { signUp, signIn } from '../services/auth';

const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!isLogin && (!username || !fullName || !phoneNumber)) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { user, error } = await signIn(email, password);
        if (error) {
          Alert.alert('Login Failed', error);
        }
      } else {
        const { user, error } = await signUp({
          email,
          password,
          username,
          full_name: fullName,
          phone_number: phoneNumber,
        });
        if (error) {
          Alert.alert('Sign Up Failed', error);
        } else {
          Alert.alert('Success', 'Account created! Please log in.');
          setIsLogin(true);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <LinearGradient
        colors={[COLORS.primary, COLORS.secondary]}
        style={styles.gradient}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo/Header */}
          <View style={styles.header}>
            <MaterialIcons name="loyalty" size={80} color={COLORS.white} />
            <Text style={styles.title}>Loyalty Stamp</Text>
            <Text style={styles.subtitle}>
              Collect stamps, earn rewards
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </Text>

            <View style={styles.inputContainer}>
              <MaterialIcons name="email" size={20} color={COLORS.gray} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={COLORS.gray}
              />
            </View>

            <View style={styles.inputContainer}>
              <MaterialIcons name="lock" size={20} color={COLORS.gray} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor={COLORS.gray}
              />
            </View>

            {!isLogin && (
              <>
                <View style={styles.inputContainer}>
                  <MaterialIcons name="person" size={20} color={COLORS.gray} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Username"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <MaterialIcons name="badge" size={20} color={COLORS.gray} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    value={fullName}
                    onChangeText={setFullName}
                    placeholderTextColor={COLORS.gray}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <MaterialIcons name="phone" size={20} color={COLORS.gray} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Phone Number"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
              </>
            )}

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleAuth}
              disabled={loading}
              data-testid={isLogin ? "login-submit-button" : "signup-submit-button"}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isLogin ? 'Login' : 'Sign Up'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => setIsLogin(!isLogin)}
            >
              <Text style={styles.switchButtonText}>
                {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Login'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SIZES.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: SIZES.md,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.white,
    opacity: 0.9,
    marginTop: SIZES.xs,
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: SIZES.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: SIZES.lg,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.light,
    borderRadius: 12,
    marginBottom: SIZES.md,
    paddingHorizontal: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputIcon: {
    marginRight: SIZES.sm,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: COLORS.dark,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SIZES.md,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchButton: {
    marginTop: SIZES.lg,
    alignItems: 'center',
  },
  switchButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AuthScreen;
