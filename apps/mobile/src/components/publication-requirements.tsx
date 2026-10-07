import { View } from 'react-native';
import { ThemedText } from './themed-text';
import { FlowSection } from './flow-layout';
export function PublicationRequirements() {
  return <FlowSection title="Before your business can go live" description="You can save a draft now and finish these steps later." collapsible>
    <View style={{ gap: 10 }}>
      <ThemedText>• A description of at least 20 characters and one category</ThemedText>
      <ThemedText>• Contact details and your location or service area</ThemedText>
      <ThemedText>• Hours for all seven days, including closed days</ThemedText>
      <ThemedText>• A processed logo and cover photo</ThemedText>
      <ThemedText themeColor="textSecondary">Submit for Parish Pass review once these are complete. A menu or service list is recommended. Buying a plan does not approve your listing.</ThemedText>
    </View>
  </FlowSection>;
}
