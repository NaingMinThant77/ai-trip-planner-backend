import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateActivityDto, UpdateActivityDto } from './activity.dto';

function errorsFor(cls: typeof CreateActivityDto | typeof UpdateActivityDto, body: object) {
  return validateSync(plainToInstance(cls, body)).map((error) => error.property);
}

describe('activity DTO clock times', () => {
  it.each(['00:00', '09:00', '10:20', '12:30', '23:59'])('accepts %s', (time) => {
    expect(errorsFor(CreateActivityDto, { title: 'Stop', startTime: time, endTime: time })).toEqual(
      [],
    );
    expect(errorsFor(UpdateActivityDto, { startTime: time, endTime: time })).toEqual([]);
  });

  it.each(['9:00', '24:00', '12:60', '9:00 AM', '0d:0d', ''])('rejects %p', (time) => {
    expect(errorsFor(UpdateActivityDto, { startTime: time })).toEqual(['startTime']);
  });

  it('does not require timeOfDay when times are sent', () => {
    expect(
      errorsFor(CreateActivityDto, { title: 'Stop', startTime: '09:00', endTime: '10:00' }),
    ).toEqual([]);
  });
});
