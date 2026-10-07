// Browser-only approximation for visual text-growth checks, never a production module.
import React, { forwardRef } from 'react';
import * as NativeWeb from 'react-native-web';
export * from 'react-native-web';
function scaledStyle(style:any){
  const requested=Number(new URLSearchParams(location.search).get('textScale')||1);
  const scale=[1,1.3,1.5].includes(requested)?requested:1;
  if(scale===1)return style;
  const flat=NativeWeb.StyleSheet.flatten(style)||{};
  return [style,{fontSize:(flat.fontSize||16)*scale,...(flat.lineHeight?{lineHeight:flat.lineHeight*scale}:{})}];
}
export const Text=forwardRef<any,any>((props,ref)=><NativeWeb.Text {...props} ref={ref} style={scaledStyle(props.style)}/>);
export const TextInput=forwardRef<any,any>((props,ref)=><NativeWeb.TextInput {...props} ref={ref} style={scaledStyle(props.style)}/>);
export function useWindowDimensions(){const dimensions=NativeWeb.useWindowDimensions();const requested=Number(new URLSearchParams(location.search).get('textScale')||1);return {...dimensions,fontScale:[1,1.3,1.5].includes(requested)?requested:1};}
