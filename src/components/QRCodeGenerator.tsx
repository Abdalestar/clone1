import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../utils/constants';

interface QRCodeGeneratorProps {
  value: string;
  size?: number;
  logo?: any;
  onShare?: () => void;
  title?: string;
  subtitle?: string;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  value,
  size = 200,
  logo,
  onShare,
  title,
  subtitle,
}) => {
  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

      <View style={styles.qrContainer}>
        <QRCode
          value={value}
          size={size}
          color={COLORS.black}
          backgroundColor={COLORS.white}
          logo={logo}
          logoSize={size * 0.2}
          logoBackgroundColor={COLORS.white}
          logoMargin={2}
          logoBorderRadius={10}
        />
      </View>

      {onShare && (
        <TouchableOpacity style={styles.shareButton} onPress={onShare}>
          <MaterialIcons name="share" size={20} color={COLORS.white} />
          <Text style={styles.shareButtonText}>Share QR Code</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: SIZES.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SIZES.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: SIZES.lg,
    textAlign: 'center',
  },
  qrContainer: {
    padding: SIZES.lg,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderRadius: 12,
    marginTop: SIZES.lg,
  },
  shareButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: SIZES.sm,
  },
});

export default QRCodeGenerator;
