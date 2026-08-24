package com.inventorylite.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

import org.json.JSONObject;

public class BusinessOverviewLargeWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_large);

        JSONObject data = WidgetDataFetcher.getWidgetData(context);
        if (data != null) {
            views.setTextViewText(R.id.txt_sales_val, data.optString("todaySalesFormatted", "Rs. 0.00"));
            views.setTextViewText(R.id.txt_expenses_val, data.optString("todayExpensesFormatted", "Rs. 0.00"));
            views.setTextViewText(R.id.txt_stock_val, data.optInt("currentStockQty", 0) + " items");
            views.setTextViewText(R.id.txt_udhaar_val, data.optString("customerUdhaarFormatted", "Rs. 0.00"));
            
            int lowStock = data.optInt("lowStockCount", 0);
            views.setTextViewText(R.id.txt_low_stock_val, lowStock + " products");

            boolean hasCostError = data.optBoolean("hasCostDataError", false);
            String profitStr = data.optString("estimatedProfitFormatted", "Not available");
            views.setTextViewText(R.id.txt_profit_val, hasCostError ? "Not available" : profitStr);

            String timeStr = data.optString("updatedAtFormatted", "");
            if (!timeStr.isEmpty()) {
                views.setTextViewText(R.id.txt_updated_time, "Updated " + timeStr);
            }
        } else {
            views.setTextViewText(R.id.txt_sales_val, "Not available");
            views.setTextViewText(R.id.txt_expenses_val, "Not available");
            views.setTextViewText(R.id.txt_stock_val, "Not available");
            views.setTextViewText(R.id.txt_udhaar_val, "Not available");
            views.setTextViewText(R.id.txt_low_stock_val, "Not available");
            views.setTextViewText(R.id.txt_profit_val, "Not available");
            views.setTextViewText(R.id.txt_updated_time, "Offline");
        }

        // Open App Button
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(WidgetDataFetcher.APP_BASE_URL + "/app/dashboard"));
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context, 201, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.btn_open_app, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
