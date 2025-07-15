import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if the application is running properly
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      service: 'coagents-ui',
      version: process.env.npm_package_version || '1.0.0'
    };

    return NextResponse.json(healthCheck, { status: 200 });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}