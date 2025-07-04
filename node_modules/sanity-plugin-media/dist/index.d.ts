import {AssetSourceComponentProps} from 'sanity'
import {ForwardRefExoticComponent} from 'react'
import {JSX as JSX_2} from 'react'
import {Plugin as Plugin_2} from 'sanity'
import {RefAttributes} from 'react'
import {SVGProps} from 'react'

export declare const media: Plugin_2<void | MediaToolOptions>

export declare const mediaAssetSource: {
  component: (props: AssetSourceComponentProps) => JSX_2.Element
  icon: ForwardRefExoticComponent<
    Omit<SVGProps<SVGSVGElement>, 'ref'> & RefAttributes<SVGSVGElement>
  >
  name: string
  title: string
}

export declare type MediaToolOptions = {
  maximumUploadSize?: number
  creditLine: {
    enabled: boolean
    excludeSources?: string | string[]
  }
}

export {}
