import React, { PropsWithChildren } from 'react'

import SwaggerUI from "swagger-ui-react"
import "swagger-ui-react/swagger-ui.css"
import "./custom-swagger-override.css"

function Heading5({ children }: PropsWithChildren) {
  return <h5 className="vocs_H5 vocs_Heading">{children}</h5>
}

function HorizontalRule() {
  return <hr className="vocs_HorizontalRule" />
}

export default function RestAPIDoc() {
  return (
    <div className="rest-api-doc">
      <Heading5>
        @ecp.eth/indexer
      </Heading5>
      <HorizontalRule />
      <SwaggerUI
        url="/indexer-openapi.yaml"
        docExpansion="list"
        tryItOutEnabled={false}
      />
    </div>
  )
}
