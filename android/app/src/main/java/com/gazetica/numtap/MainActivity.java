package com.gazetica.numtap;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // T-019: register the app-local Play Billing plugin before the bridge boots.
        registerPlugin(BillingPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
