package com.inventorylite.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONObject;

public class DailySalesSmallWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_small);

        // Fetch data
        JSONObject data = WidgetDataFetcher.getWidgetData(context);
        if (data != null) {
            String salesFormatted = data.optString("todaySalesFormatted", "Rs. 0.00");
            int salesCount = data.optInt("todaySalesCount", 0);
            String timeFormatted = data.optString("updatedAtFormatted", "");

            views.setTextViewText(R.id.txt_sales_amount, salesFormatted);
            views.setTextViewText(R.id.txt_sales_count, salesCount + " sales");
            if (!timeFormatted.isEmpty()) {
                views.setTextViewText(R.id.txt_status, "Updated " + timeFormatted);
                views.setViewVisibility(R.id.txt_status, View.VISIBLE);
            }
        } else {
            views.setTextViewText(R.id.txt_sales_amount, "Not available");
            views.setTextViewText(R.id.txt_sales_count, "Tap to open");
        }

        // Tap action -> Open Dashboard URL or installed PWA
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(WidgetDataFetcher.APP_BASE_URL + "/app/dashboard"));
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_small_root, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
