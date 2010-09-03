#! /bin/bash

#ldconfig

PATH="/usr/local/bin:/usr/bin:/bin:/usr/bin/X11:/usr/games:/usr/local/sony/bin:/usr/sbin"
LD_LIBRARY_PATH="/opt/sony/ebook/application:/lib:/usr/lib:/usr/local/sony/lib:/opt/sony/ebook/lib"
export PATH LD_LIBRARY_PATH

# set initial date
/bin/date 0101000009

# Call custom script if ebook is not connected to USB
USBCONN=`/bin/cat /proc/usbtg/connect`
if [ "$USBCONN" == 0 ]
then
	/usr/local/sony/bin/mtdmount -t vfat -o utf8 -o shortname=winnt Data /Data

	# win1251 to UTF8 hack, replacing standard FskTextLatin1ToUTF8
	TEXT_ENCODING_FILE=/opt0/prsp/TextEncoding.config
	if [ -f  ${TEXT_ENCODING_FILE} ]
	then
		export LD_PRELOAD=/opt/sony/ebook/application/Latin1toUTF8.so
	fi

	# Run prsp.sh shell script located on sd card,
	if [ -f /Data/database/system/PRSPlus/prsp.sh ]
	then
		. /Data/database/system/PRSPlus/prsp.sh
	fi
	/bin/umount /Data
else
	touch /tmp/safemode	
fi

#start kbook application
/opt/sony/ebook/application/tinyhttp
if [ $? == 0 ]; then
	if [ -r /tmp/exitcode ]; then
		CODE=`/bin/cat /tmp/exitcode`
		/bin/rm /tmp/exitcode
#		/bin/echo $CODE
		if [ $CODE == 3 ]; then
			NUM=`grep "\"Data\"" /proc/mtd | awk -F: '{print $1}' | awk -Fd '{print$2}'`
			/usr/local/sony/bin/mkdosfs /dev/mtdblock$NUM
			/bin/grep "\"Data\"" /etc/mtab > /dev/null
			if [ $? == 0 ]; then
#				/bin/echo reboot
				/sbin/reboot
			else
#				/bin/echo restart application				
				exec /opt/sony/ebook/bin/tinyhttp.sh
			fi
		fi
	fi
#	/bin/echo shutdown
	/sbin/shutdown -h now
else
#	/bin/echo reboot
	/sbin/reboot
fi