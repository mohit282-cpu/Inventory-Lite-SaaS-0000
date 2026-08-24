package com.inventorylite.widget;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONObject;

public class WidgetDataFetcher {

    public static final String APP_BASE_URL = "https://inventory-lite-saa-s-0000.vercel.app";
    private static final String PREFS_NAME = "InventoryLiteWidgetPrefs";
    private static final String KEY_CACHED_JSON = "cached_widget_json";
    private static final String KEY_ACTIVE_BIZ_ID = "active_business_id";

    public static JSONObject getWidgetData(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String rawJson = prefs.getString(KEY_CACHED_JSON, null);
        if (rawJson == null) return null;
        try {
            return new JSONObject(rawJson);
        } catch (Exception e) {
            return null;
        }
    }

    public static void saveWidgetData(Context context, String businessId, String jsonPayload) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
                .putString(KEY_ACTIVE_BIZ_ID, businessId)
                .putString(KEY_CACHED_JSON, jsonPayload)
                .apply();
    }

    public static void clearWidgetData(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().clear().apply();
    }
}
