import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const rawPoints = `
00:00	13.030158	77.708256
00:30	13.030921	77.706812
01:00	13.031486	77.705291
01:30	13.032042	77.703764
02:00	13.032684	77.702218
02:30	13.033421	77.700735
03:00	13.034188	77.699281
03:30	13.035021	77.697842
04:00	13.035816	77.696394
04:30	13.036544	77.694872
05:00	13.037216	77.693314
05:30	13.037841	77.691762
06:00	13.038412	77.690201
06:30	13.038934	77.688604
07:00	13.039401	77.687021
07:30	13.039812	77.685438
08:00	13.040167	77.683812
08:30	13.040461	77.682194
09:00	13.040698	77.680552
09:30	13.040891	77.678921
10:00	13.041047	77.677284
10:30	13.041174	77.675648
11:00	13.041269	77.674021
11:30	13.041331	77.672394
12:00	13.041361	77.670762
12:30	13.041349	77.669131
13:00	13.041294	77.667507
13:30	13.041195	77.665893
14:00	13.041053	77.664287
14:30	13.040861	77.662694
15:00	13.040624	77.661113
15:30	13.040344	77.659544
16:00	13.040021	77.657987
16:30	13.039654	77.656441
17:00	13.039252	77.654908
17:30	13.038812	77.653388
18:00	13.038335	77.651882
18:30	13.037821	77.650391
19:00	13.037274	77.648914
19:30	13.036692	77.647451
20:00	13.036076	77.646003
20:30	13.035426	77.644570
21:00	13.034744	77.643152
21:30	13.034029	77.641748
22:00	13.033282	77.640359
22:30	13.032502	77.638983
23:00	13.031689	77.637621
23:30	13.030843	77.636272
24:00	13.029964	77.634936
24:30	13.029053	77.633613
25:00	13.028109	77.632303
25:30	13.027132	77.631006
26:00	13.026122	77.629722
26:30	13.025079	77.628452
27:00	13.024003	77.627194
27:30	13.022895	77.625949
28:00	13.021754	77.624716
28:30	13.020581	77.623497
29:00	13.019375	77.622290
29:30	13.018137	77.621096
30:00	13.016866	77.619914
30:30	13.015562	77.618744
31:00	13.014226	77.617585
31:30	13.012857	77.616438
32:00	13.011455	77.615301
32:30	13.010021	77.614176
33:00	13.008555	77.613061
33:30	13.007056	77.611957
34:00	13.005525	77.610864
34:30	13.003962	77.609783
35:00	13.002367	77.608714
35:30	13.000741	77.607656
36:00	12.999084	77.606610
36:30	12.997396	77.605576
37:00	12.995677	77.604554
37:30	12.993927	77.603545
38:00	12.992146	77.602547
38:30	12.990334	77.601562
39:00	12.988491	77.600589
39:30	12.986617	77.599629
40:00	12.984712	77.598681
40:30	12.982777	77.597745
41:00	12.980811	77.596822
41:30	12.978815	77.595911
42:00	12.976788	77.595014
42:30	12.974731	77.594130
43:00	12.972644	77.593259
43:30	12.970527	77.592401
44:00	12.968380	77.591557
44:30	12.966203	77.590725
45:00	12.964000	77.589906
`;

const points = rawPoints.trim().split('\n').map(line => {
  const parts = line.trim().split(/[ \t]+/);
  const time = parts[0];
  const min = parseInt(time.split(':')[0]);
  const sec = parseInt(time.split(':')[1]);
  return {
    offsetSeconds: min * 60 + sec,
    lat: parseFloat(parts[1]),
    lng: parseFloat(parts[2]),
  };
});

async function seed() {
  // Find employee netro-emp001
  const user = await prisma.user.findFirst({
    where: { employeeId: 'EMP001' }
  });

  if (!user) {
    console.error('User netro-emp001 not found');
    process.exit(1);
  }

  const todayStr = new Date().toISOString().split('T')[0];

  // Clean existing data for this user for today to prevent duplicates if re-run
  await prisma.attendance.deleteMany({
    where: {
      userId: user.id,
      punchInTime: {
        gte: new Date(todayStr + 'T00:00:00.000Z'),
        lte: new Date(todayStr + 'T23:59:59.999Z'),
      }
    }
  });

  await prisma.gpsLocation.deleteMany({
    where: {
      userId: user.id,
      recordedAt: {
        gte: new Date(todayStr + 'T00:00:00.000Z'),
        lte: new Date(todayStr + 'T23:59:59.999Z'),
      }
    }
  });

  // Morning Route (Up)
  // Punch In at 09:00 AM UTC
  const upStart = new Date(todayStr + 'T09:00:00.000Z');
  const upEnd = new Date(upStart.getTime() + points[points.length - 1].offsetSeconds * 1000);
  
  const upAttendance = await prisma.attendance.create({
    data: {
      companyId: user.companyId,
      userId: user.id,
      punchInTime: upStart,
      punchInLatitude: points[0].lat,
      punchInLongitude: points[0].lng,
      punchOutTime: upEnd,
      punchOutLatitude: points[points.length - 1].lat,
      punchOutLongitude: points[points.length - 1].lng,
      workingHours: (upEnd.getTime() - upStart.getTime()) / (1000 * 60 * 60)
    }
  });

  const upGpsLocations = points.map(pt => ({
    companyId: user.companyId,
    userId: user.id,
    attendanceId: upAttendance.id,
    latitude: pt.lat,
    longitude: pt.lng,
    recordedAt: new Date(upStart.getTime() + pt.offsetSeconds * 1000),
    isAccurate: true,
  }));

  await prisma.gpsLocation.createMany({
    data: upGpsLocations
  });

  // Afternoon Route (Down - Reverse)
  // Punch In at 14:00 PM UTC
  const reversePoints = [...points].reverse();
  // recalculate offsetSeconds for reverse so time increases
  const downPoints = reversePoints.map((pt, i) => ({
    ...pt,
    offsetSeconds: points[i].offsetSeconds // mapping the 0-45min timing onto the reversed points
  }));

  const downStart = new Date(todayStr + 'T14:00:00.000Z');
  const downEnd = new Date(downStart.getTime() + downPoints[downPoints.length - 1].offsetSeconds * 1000);

  const downAttendance = await prisma.attendance.create({
    data: {
      companyId: user.companyId,
      userId: user.id,
      punchInTime: downStart,
      punchInLatitude: downPoints[0].lat,
      punchInLongitude: downPoints[0].lng,
      punchOutTime: downEnd,
      punchOutLatitude: downPoints[downPoints.length - 1].lat,
      punchOutLongitude: downPoints[downPoints.length - 1].lng,
      workingHours: (downEnd.getTime() - downStart.getTime()) / (1000 * 60 * 60)
    }
  });

  const downGpsLocations = downPoints.map(pt => ({
    companyId: user.companyId,
    userId: user.id,
    attendanceId: downAttendance.id,
    latitude: pt.lat,
    longitude: pt.lng,
    recordedAt: new Date(downStart.getTime() + pt.offsetSeconds * 1000),
    isAccurate: true,
  }));

  await prisma.gpsLocation.createMany({
    data: downGpsLocations
  });

  console.log('Successfully seeded up and down routes for netro-emp001.');
}

seed().catch(console.error).finally(() => prisma.$disconnect());
