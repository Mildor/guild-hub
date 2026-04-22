import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WclService } from './wcl/wcl.service';
import { AdminService } from './admin/admin.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const wclService = app.get(WclService);
  const adminService = app.get(AdminService);

  console.log('-> Starting wclService.getReports()');
  const raidNights = await wclService.getReports();
  console.log('-> Got reports:', raidNights.length);

  console.log('-> Starting adminService.calculateGuildAttendance()');
  try {
    const result = await adminService.calculateGuildAttendance();
    console.log('-> DONE!');
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('-> CRASHED!', e);
  }

  await app.close();
}
bootstrap();
