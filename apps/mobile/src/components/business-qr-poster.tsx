import { useScreenBottomPadding } from '@/hooks/use-screen-bottom-padding';
import * as Clipboard from 'expo-clipboard';
import * as Print from 'expo-print';
import { BusinessLogo } from './business-logo';
import QRCode from 'react-native-qrcode-svg';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Colors, Radius, Spacing } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { exportQrCodeDataUrl, type QrCodeDataRef } from '@/lib/qr-code-export';
import {
  getBusinessPublicLinkState,
  publicShareBaseUrl,
  publicSharingUnavailableCopy,
} from '@/lib/share-links';

interface BusinessQrPosterProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly business: {
    readonly name: string;
    readonly slug: string;
    readonly primaryColor: string;
    readonly accentColor: string;
  };
  readonly logoUri?: string | null;
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ??
      character,
  );
}

export function BusinessQrPoster({ visible, onClose, business, logoUri }: BusinessQrPosterProps) {
  const bottomPadding = useScreenBottomPadding();
  const qrRef = useRef<QrCodeDataRef | null>(null);
  const [busy, setBusy] = useState<'print' | 'share' | 'copy' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const publicLink = getBusinessPublicLinkState(business.slug, publicShareBaseUrl());
  const url = publicLink.available ? publicLink.url : null;

  function resetNotice() {
    setNotice(null);
  }

  async function copyLink() {
    if (!url) return;
    setBusy('copy');
    await Clipboard.setStringAsync(url);
    void haptics.success();
    setNotice('Business page link copied.');
    setBusy(null);
  }

  async function shareLink() {
    if (!url) return;
    setBusy('share');
    try {
      await Share.share({
        title: `${business.name} on Parish Pass`,
        message: `Visit ${business.name} on Parish Pass:\n${url}`,
        url,
      });
      void haptics.success();
    } catch {
      setNotice('The share sheet could not open on this device.');
    } finally {
      setBusy(null);
    }
  }

  async function printPoster() {
    if (!url || !qrRef.current?.toDataURL) return;
    setBusy('print');
    resetNotice();
    try {
      const qrDataUrl = await exportQrCodeDataUrl(qrRef.current);
      const primary = escapeHtml(business.primaryColor || Brand.primary);
      const accent = escapeHtml(business.accentColor || Brand.primary);
      const logo = logoUri
        ? `<img class="logo" src="${escapeHtml(logoUri)}" alt="${escapeHtml(business.name)} logo" />`
        : '';
      const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1" /><style>
        @page { margin: 0; size: Letter; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #10241b; }
        .poster { min-height: 100vh; padding: 52px 42px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; background: linear-gradient(145deg, ${primary} 0%, ${accent} 100%); }
        .paper { width: 100%; max-width: 620px; padding: 44px 34px 38px; border-radius: 28px; background: #f8faf8; box-shadow: 0 16px 50px rgba(0,0,0,.18); }
        .logo { width: 82px; height: 82px; object-fit: contain; padding: 6px; background: ${Colors.light.logoSurface}; border-radius: 22px; margin-bottom: 18px; }
        .mark { width: 82px; height: 82px; margin: 0 auto 18px; border-radius: 22px; display: flex; align-items: center; justify-content: center; background: ${primary}; color: white; font-size: 42px; font-weight: 700; }
        h1 { margin: 0; font-size: 36px; line-height: 1.05; letter-spacing: -1px; }
        p { margin: 12px 0 0; color: #52655c; font-size: 18px; line-height: 1.4; }
        .qr { width: 260px; height: 260px; margin: 30px auto 22px; }
        .cta { margin: 0; color: ${primary}; font-size: 24px; font-weight: 700; }
        .url { margin-top: 22px; color: #687a72; font-size: 12px; word-break: break-all; }
      </style></head><body><main class="poster"><section class="paper">${logo || `<div class="mark">${escapeHtml(business.name.slice(0, 1).toUpperCase())}</div>`}<h1>${escapeHtml(business.name)}</h1><p>Scan to view our page, offerings, events, and rewards.</p><img class="qr" src="${qrDataUrl}" alt="QR code" /><p class="cta">Open Parish Pass</p><p class="url">${escapeHtml(url)}</p></section></main></body></html>`;
      await Print.printAsync({ html });
      void haptics.success();
      setNotice('Poster sent to the print dialog.');
    } catch {
      void haptics.error();
      setNotice('We could not create the poster. Try again from a native build.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.root}>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.backdrop} />
        <ThemedView style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <ThemedText type="subtitle">QR poster</ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                Put this sign at the counter, window, or truck so customers can find your page.
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              hitSlop={10}
              onPress={onClose}
              style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }}
            >
              <ThemedText type="smallBold">Done</ThemedText>
            </Pressable>
          </View>
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
          >
            {url ? (
              <>
                <View style={styles.posterPreview}>
                  <BusinessLogo name={business.name} uri={logoUri} size={60} decorative />
                  <ThemedText type="subtitle" style={styles.posterName}>
                    {business.name}
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" style={styles.posterCopy}>
                    Scan to view our page, offerings, events, and rewards.
                  </ThemedText>
                  <View style={styles.qrShell}>
                    <QRCode
                      backgroundColor="#FFFFFF"
                      color="#10241B"
                      ecl="H"
                      getRef={(ref) => {
                        qrRef.current = ref;
                      }}
                      {...(logoUri ? { logo: { uri: logoUri } } : {})}
                      logoBackgroundColor="#FFFFFF"
                      logoBorderRadius={10}
                      logoSize={34}
                      quietZone={8}
                      size={220}
                      value={url}
                    />
                  </View>
                  <ThemedText
                    style={[styles.posterCta, { color: business.primaryColor }]}
                    type="smallBold"
                  >
                    Open Parish Pass
                  </ThemedText>
                </View>
                <View style={styles.actions}>
                  <Pressable
                    disabled={Boolean(busy)}
                    onPress={() => void printPoster()}
                    style={[styles.primaryButton, busy === 'print' && styles.disabled]}
                  >
                    {busy === 'print' ? (
                      <ActivityIndicator color={Brand.onPrimary} />
                    ) : (
                      <ThemedText style={styles.primaryText} type="smallBold">
                        Print poster
                      </ThemedText>
                    )}
                  </Pressable>
                  <View style={styles.actionRow}>
                    <Pressable
                      disabled={Boolean(busy)}
                      onPress={() => void shareLink()}
                      style={[styles.secondaryButton, busy === 'share' && styles.disabled]}
                    >
                      <ThemedText type="smallBold">Share link</ThemedText>
                    </Pressable>
                    <Pressable
                      disabled={Boolean(busy)}
                      onPress={() => void copyLink()}
                      style={[styles.secondaryButton, busy === 'copy' && styles.disabled]}
                    >
                      <ThemedText type="smallBold">Copy link</ThemedText>
                    </Pressable>
                  </View>
                </View>
                {notice && (
                  <ThemedText themeColor="textSecondary" type="small" style={styles.notice}>
                    {notice}
                  </ThemedText>
                )}
              </>
            ) : (
              <View style={styles.unconfigured}>
                <ThemedText type="subtitle">{publicSharingUnavailableCopy.title}</ThemedText>
                <ThemedText themeColor="textSecondary">
                  {publicSharingUnavailableCopy.body}
                </ThemedText>
              </View>
            )}
          </ScrollView>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(4,12,8,0.62)' },
  sheet: {
    maxHeight: '92%',
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  headerCopy: { flex: 1, gap: Spacing.one },
  content: { gap: Spacing.three, paddingBottom: Spacing.two },
  posterPreview: {
    alignItems: 'center',
    borderRadius: Radius.large,
    padding: Spacing.four,
    backgroundColor: '#F8FAF8',
  },
  logo: { width: 60, height: 60, borderRadius: 16, marginBottom: Spacing.two },
  logoFallback: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  logoFallbackText: { color: '#FFFFFF' },
  posterName: { color: '#10241B', textAlign: 'center' },
  posterCopy: { maxWidth: 280, color: '#52655C', textAlign: 'center', marginTop: Spacing.one },
  qrShell: {
    marginVertical: Spacing.three,
    padding: Spacing.two,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  posterCta: { fontSize: 18 },
  actions: { gap: Spacing.two },
  actionRow: { flexDirection: 'row', gap: Spacing.two },
  primaryButton: {
    minHeight: 50,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    backgroundColor: Brand.primary,
  },
  primaryText: { color: Brand.onPrimary },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: Radius.small,
    borderWidth: 1,
    borderColor: '#718078',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  disabled: { opacity: 0.55 },
  notice: { textAlign: 'center' },
  unconfigured: {
    gap: Spacing.two,
    borderRadius: Radius.large,
    padding: Spacing.four,
    backgroundColor: 'rgba(120,140,128,0.1)',
  },
});
